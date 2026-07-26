import { expect, test } from "@playwright/test";
import { loginAsDevPersona } from "./helpers/auth";

test.describe("Flow C — Coach command center", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevPersona(page, "coach");
    await expect(page).toHaveURL(/\/coach$/);
  });

  test("TC-FM04-010: command center loads", async ({ page }) => {
    await expect(page.getByText(/Check-ins|Command center|Needs review/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("TC-FM03-010: plan delivery list", async ({ page }) => {
    await page.goto("/coach/plans");
    await expect(page.getByRole("heading", { name: "Plan delivery" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Content blocks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Exercise catalog" })).toBeVisible();
  });

  test("TC-COACH-NAV: top nav on all coach screens", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Members" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan delivery" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    await page.goto("/coach/settings");
    await expect(page.getByRole("link", { name: "Command center" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Brand & voice/i })).toBeVisible();
  });

  test("TC-COACH-GUIDE: how-to guide download", async ({ page }) => {
    await page.goto("/coach/settings");
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/coach/user-guide", {
        headers: { Authorization: "Bearer dev-local-token" },
      });
      const buf = await r.arrayBuffer();
      const header = new TextDecoder().decode(new Uint8Array(buf).slice(0, 4));
      return { ok: r.ok, status: r.status, header, size: buf.byteLength };
    });
    expect(res.ok).toBe(true);
    expect(res.header).toBe("%PDF");
    expect(res.size).toBeGreaterThan(800);
  });

  test("TC-COACH-001: members active tab", async ({ page }) => {
    await page.goto("/coach/members");
    await expect(page.getByText("Avinash Mehta")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Hetal Patel").first()).toBeVisible();
  });

  test("TC-COACH-002: member profile loads", async ({ page }) => {
    await page.goto("/coach/members");
    await page.getByRole("link", { name: /Avinash Mehta/i }).click();
    await expect(page).toHaveURL(/\/coach\/members\//);
    await expect(page.getByRole("heading", { name: "Avinash Mehta" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("avinash@abstrack.local")).toBeVisible();
  });

  test("TC-MSG-002: coach sees member message thread", async ({ page }) => {
    const demoMemberId = await page.evaluate(async () => {
      const res = await fetch("/api/members", {
        headers: { Authorization: "Bearer dev-local-token" },
      });
      const members = (await res.json()) as { id: string; email: string }[];
      return members.find((m) => m.email === "member@abstrack.local")?.id ?? null;
    });
    expect(demoMemberId).toBeTruthy();
    await page.goto(`/coach/members/${demoMemberId}`);
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByText(/Welcome to Abs-Track|Say hi to your coach/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByLabel("Message")).toBeVisible();
  });

  test("TC-COACH-003: paused clients tab", async ({ page }) => {
    await page.goto("/coach/members");
    await page.getByRole("button", { name: /Paused/i }).click();
    await expect(page.getByText("Former Client (paused)")).toBeVisible({ timeout: 10_000 });
  });

  test("TC-COACH-PROGRESS: members progress tab and journey", async ({ page }) => {
    await page.goto("/coach/members");
    await page.getByRole("button", { name: /Progress/i }).click();
    await expect(page.getByText("Avinash Mehta").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("link", { name: /Avinash Mehta/i }).click();
    await expect(page).toHaveURL(/\/coach\/members\/.*\?tab=journey/);
    await expect(page.getByRole("heading", { name: /Avinash Mehta's journey/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "← Earlier" })).toBeVisible();
  });

  test("TC-COACH-APPT: coach can book appointment via API", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const membersRes = await fetch("/api/members", {
        headers: { Authorization: "Bearer dev-local-token" },
      });
      const members = (await membersRes.json()) as { id: string; email: string }[];
      const member = members.find((m) => m.email === "avinash@abstrack.local");
      if (!member) return { ok: false, status: 0 };
      const start = new Date(Date.now() + (9 + (Date.now() % 720)) * 86400000);
      start.setHours(14, 0, 0, 0);
      const end = new Date(start.getTime() + 3600000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          Authorization: "Bearer dev-local-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: member.id,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          meetingType: "none",
        }),
      });
      return { ok: res.ok, status: res.status };
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
  });
});
