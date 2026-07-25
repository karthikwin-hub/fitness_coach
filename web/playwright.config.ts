import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3011";
const defaultBaseURL = `http://localhost:${e2ePort}`;
/** Only honor PLAYWRIGHT_BASE_URL when attaching to an existing server (see PLAYWRIGHT_SKIP_WEBSERVER). */
const baseURL =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER && process.env.PLAYWRIGHT_BASE_URL
    ? process.env.PLAYWRIGHT_BASE_URL
    : defaultBaseURL;

/** Dev personas only render when Firebase client env vars are unset (cleared in scripts/e2e-server.mjs). */

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "node scripts/e2e-server.mjs",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          PLAYWRIGHT_PORT: e2ePort,
        },
      },
});
