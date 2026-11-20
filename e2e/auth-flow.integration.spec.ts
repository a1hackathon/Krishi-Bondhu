import { expect, test } from "@playwright/test";

test.skip(process.env.RUN_AUTH_DB_INTEGRATION !== "1", "Requires the isolated live database integration harness.");
test.setTimeout(120_000);

const authActionTimeout = 30_000;

function testPhone() {
  return `01${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`;
}

test("Farmer can sign up, sign out, and sign back in", async ({ page }) => {
  const phone = testPhone();
  await page.goto("/en");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("First name").fill("Demo");
  await page.getByLabel("Last name").fill("Farmer");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByLabel("Confirm password").fill("demo-password-123");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByText("Your account is ready. You are signed in.")).toBeVisible({ timeout: authActionTimeout });

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("You are signed in. Your workspace is coming in the next milestone.")).toBeVisible({ timeout: authActionTimeout });
});

test("Officer demo signup creates a pending account without a session", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByRole("button", { name: "Officer" }).click();
  await page.getByLabel("First name").fill("Demo");
  await page.getByLabel("Last name").fill("Officer");
  await page.getByLabel("Phone number").fill(testPhone());
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByLabel("Confirm password").fill("demo-password-123");
  await page.getByLabel("Officer demo bypass code").fill("1234");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByText("Sent for verification. You will receive a message soon.")).toBeVisible({ timeout: authActionTimeout });
  await expect(page.getByLabel("Phone number")).toBeVisible();
});

test("Admin demo access code is checked at signup and login", async ({ page }) => {
  const phone = testPhone();
  await page.goto("/en");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByLabel("First name").fill("Demo");
  await page.getByLabel("Last name").fill("Admin");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByLabel("Confirm password").fill("demo-password-123");
  await page.getByLabel("Admin access code").fill("1234");
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page.getByText("Your account is ready. You are signed in.")).toBeVisible({ timeout: authActionTimeout });

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByLabel("Admin access code").fill("1234");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("You are signed in. Your workspace is coming in the next milestone.")).toBeVisible({ timeout: authActionTimeout });
});
