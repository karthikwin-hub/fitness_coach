import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

type DevPersonaId =
  | "coach"
  | "member-demo"
  | "member-hetal"
  | "member-avinash"
  | "member-shruti"
  | "member-new";

const PERSONA_LABELS: Record<DevPersonaId, RegExp> = {
  coach: /Coach — Helna/i,
  "member-demo": /Member — Demo \(Hetal plans\)/i,
  "member-hetal": /Member — Hetal/i,
  "member-avinash": /Member — Dr\. Avinash/i,
  "member-shruti": /Member — Shruti/i,
  "member-new": /Member — New \(no plans\)/i,
};

export async function loginAsDevPersona(page: Page, personaId: DevPersonaId) {
  await page.goto("/login?switch=1");
  const picker = page.getByRole("button", { name: PERSONA_LABELS[personaId] });
  await expect(picker).toBeVisible({ timeout: 10_000 });
  await picker.click();
  const expectedPath = personaId === "coach" ? /\/coach/ : /\/member/;
  await expect(page).toHaveURL(expectedPath, { timeout: 15_000 });
}

async function clickQuizOption(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name }).click();
  await page.waitForTimeout(300);
}

async function submitQuizEmail(page: Page, email = "prospect@example.com") {
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: "See my track" }).click();
}

export async function completeQuizHighIntent(page: Page) {
  await page.goto("/quiz");
  await clickQuizOption(page, "Fat loss");
  await clickQuizOption(page, "Consistency");
  await clickQuizOption(page, "Indian macros & local diet");
  await clickQuizOption(page, "India");
  await clickQuizOption(page, "Ready — I want a coach");
  await submitQuizEmail(page);
}

export async function completeQuizLowIntent(page: Page) {
  await page.goto("/quiz");
  await clickQuizOption(page, "General health");
  await clickQuizOption(page, "Time / schedule");
  await clickQuizOption(page, "Western macros");
  await clickQuizOption(page, "Other");
  await clickQuizOption(page, "Prefer self-paced content");
  await submitQuizEmail(page, "waitlist@example.com");
}
