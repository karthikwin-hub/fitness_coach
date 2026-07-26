import { expect, test } from "@playwright/test";
import { loginAsDevPersona } from "./helpers/auth";

test.describe("Flow B — Member PWA", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDevPersona(page, "member-demo");
    await expect(page).toHaveURL(/\/member/);
  });

  test("TC-FM04-001: dashboard loads with streak/compliance", async ({ page }) => {
    await expect(page.getByText(/Compliance/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("TC-UX-001: bottom nav tabs present", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Progress" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Workouts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nutrition" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
  });

  test("TC-MEMBER-PROGRESS: member program progress page", async ({ page }) => {
    await page.getByRole("link", { name: "Progress" }).click();
    await expect(page).toHaveURL(/\/member\/progress/);
    await expect(page.getByRole("heading", { name: "My program progress" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "← Earlier" })).toBeVisible();
  });

  test("TC-FM05-001: workouts page loads", async ({ page }) => {
    await page.getByRole("link", { name: "Workouts" }).click();
    await expect(page).toHaveURL(/\/member\/workouts/);
    await expect(page.getByRole("button", { name: "Today's plan" })).toBeVisible();
    await expect(page.getByText(/Loading workout|Rest day|Today's|No published/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("TC-FM05-004: video library filters", async ({ page }) => {
    await page.getByRole("link", { name: "Workouts" }).click();
    await page.getByRole("button", { name: "Video library" }).click();
    await expect(page.getByRole("button", { name: "Chest" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Legs" })).toBeVisible();
  });

  test("TC-FM03-001: nutrition page loads with food diary", async ({ page }) => {
    await page.getByRole("link", { name: "Nutrition" }).click();
    await expect(page).toHaveURL(/\/member\/nutrition/);
    await expect(page.getByText(/Loading nutrition|Week|Today's totals|Nothing logged yet/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "+ Add" }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("TC-FM03-003: member can search and log food", async ({ page }) => {
    await page.getByRole("link", { name: "Nutrition" }).click();
    await page.getByRole("button", { name: "+ Add" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByPlaceholder("Search foods…").fill("chicken");
    await expect(page.getByText(/Grilled chicken|chicken/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText(/Grilled chicken with rice/i).click();
    await expect(page.getByText(/520 cal/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("TC-MSG-001: messages thread loads", async ({ page }) => {
    await page.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/member\/messages/);
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(page.getByText(/Welcome to Abs-Track|Say hi to your coach/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("New member empty states", () => {
  test("TC-FM03-002: new member nutrition does not crash", async ({ page }) => {
    await loginAsDevPersona(page, "member-new");
    await page.getByRole("link", { name: "Nutrition" }).click();
    await expect(
      page.getByText(/No published nutrition plan|Loading nutrition|Breakfast/i).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
