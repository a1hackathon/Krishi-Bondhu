import { expect, test } from "@playwright/test";

test("health endpoint reports ok", async ({ request }) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
});

test("plain HTTP requests are redirected to HTTPS", async ({ request }) => {
  const response = await request.get("/api/v1/health", {
    headers: { "x-forwarded-proto": "http" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toMatch(/^https:\/\//);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/en");
  const headers = response.headers();
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("root redirects to the English home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to X");
});

test("Bangla home page renders translated content and lang attribute", async ({ page }) => {
  await page.goto("/bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("X-এ স্বাগতম");
});
