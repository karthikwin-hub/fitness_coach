/**
 * Build + start Next.js for Playwright E2E on a dedicated port.
 * Uses production mode so it can run while `npm run dev` (:3010) is active.
 * Clears Firebase client env so dev persona login works in tests.
 */
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PLAYWRIGHT_PORT ?? "3011";

const clearedKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: port,
  HOSTNAME: "127.0.0.1",
  E2E_DEV_AUTH: "1",
  NEXT_PUBLIC_E2E_DEV_AUTH: "1",
};
for (const key of clearedKeys) {
  env[key] = "";
}

console.log(`[e2e-server] Building for E2E (Firebase cleared, port ${port})...`);
execSync("npm run build", { stdio: "inherit", cwd: webRoot, env });

console.log(`[e2e-server] Starting next start on :${port}`);
const child = spawn("npx", ["next", "start", "-p", port, "-H", "127.0.0.1"], {
  cwd: webRoot,
  env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
