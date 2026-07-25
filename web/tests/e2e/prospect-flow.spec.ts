import { expect, test } from "@playwright/test";
import { completeQuizHighIntent, completeQuizLowIntent } from "./helpers/auth";

test.describe("Flow A — Prospect funnel", () => {
  test("TC-FM01-001: landing shows brand and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ABS-TRACK", { exact: true })).toBeVisible();
    await expect(page.getByText("Stop Guessing. Start Transforming.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Find Your Fitness Path" })).toBeVisible();
  });

  test("TC-FM01-002/003: philosophy pillars", async ({ page }) => {
    await page.goto("/philosophy");
    await expect(page.getByText("Meet Coach Helna")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nutrition First" })).toBeVisible({
      timeout: 5000,
    });
  });

  test("TC-FM02-001: quiz shows progress and guide", async ({ page }) => {
    await page.goto("/quiz");
    await expect(page.getByText(/Helna's virtual guide/i)).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });

  test("TC-FM02-004: high intent routes to coaching", async ({ page }) => {
    await completeQuizHighIntent(page);
    await expect(page.getByRole("heading", { name: /great fit for hybrid coaching/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTitle("Book with Coach Helna")).toBeVisible();
  });

  test("TC-FM02-005: low intent routes to waitlist", async ({ page }) => {
    await completeQuizLowIntent(page);
    await expect(page.getByRole("heading", { name: /on the waitlist/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
