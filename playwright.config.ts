import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Behave like a TLS-terminating proxy (e.g. Vercel): the production app requires HTTPS.
    extraHTTPHeaders: { "x-forwarded-proto": "https" },
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  // Test the production build, which is what Vercel serves.
  webServer: {
    command: `pnpm exec prisma generate && pnpm exec next build --webpack && pnpm start -p ${PORT}`,
    // Wait for the port, not an HTTP URL: the HTTPS redirect would answer a plain readiness probe with 308.
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
