import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.ts"],
    exclude: ["**/.next/**", "**/node_modules/**"],
    testTimeout: 30_000,
    env: {
      NODE_ENV: "development",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
