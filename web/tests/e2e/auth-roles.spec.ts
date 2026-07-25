import { expect, test } from "@playwright/test";
import { loginAsDevPersona } from "./helpers/auth";

test.describe("Auth role guards", () => {
  test("TC-AUTH-003: dev persona picker shows 6 options", async ({ page }) => {
    await page.goto("/login?switch=1");
    await expect(page.getByRole("button", { name: /Coach — Helna/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /Member — Demo \(Hetal plans\)/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Member — Hetal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Member — Dr\. Avinash/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Member — Shruti/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Member — New \(no plans\)/i })).toBeVisible();
  });

  test("TC-AUTH-001: coach redirected from member area", async ({ page }) => {
    await loginAsDevPersona(page, "coach");
    await page.goto("/member");
    await expect(page).toHaveURL(/\/coach/, { timeout: 10_000 });
  });

  test("TC-AUTH-002: member redirected from coach area", async ({ page }) => {
    await loginAsDevPersona(page, "member-demo");
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/member/, { timeout: 10_000 });
  });
});
