import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  webServer: {
    command: "pnpm --filter web exec vite --port 5183 --strictPort",
    port: 5183,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://localhost:5183",
  },
});
