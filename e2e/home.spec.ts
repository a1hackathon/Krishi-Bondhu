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

test("root redirects to the English sign-in screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Welcome back");
  await expect(page.getByRole("button", { name: "Farmer" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Phone number")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test("Bangla sign-in screen renders translated content and lang attribute", async ({ page }) => {
  await page.goto("/bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("আবার স্বাগতম");
  await expect(page.getByLabel("মোবাইল নম্বর")).toBeVisible();
});

test("production disables officer signup without the demo bypass", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByRole("button", { name: "Officer" }).click();
  await expect(page.getByText("Registration for this role is not configured in this environment yet.")).toBeVisible();
  await expect(page.getByLabel("Officer demo bypass code")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create your account" })).toBeDisabled();
});

test("production requires an Admin code at sign-in and disables demo signup", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page.getByLabel("Admin access code")).toBeVisible();

  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByText("Registration for this role is not configured in this environment yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your account" })).toBeDisabled();
  await expect(page.getByLabel("Admin access code")).toHaveCount(0);
});
