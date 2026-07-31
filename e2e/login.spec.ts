import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should login with admin credentials and redirect to dashboard", async ({
    page,
  }) => {
    // 1. Navigate to /login
    await page.goto("/login");
    await page.waitForSelector('text="Sign In"', { timeout: 10_000 });

    // 2. Fill email
    await page.fill(
      'input[type="email"]',
      process.env.ADMIN_EMAIL || "admin@example.com"
    );

    // 3. Fill password
    await page.fill(
      'input[type="password"]',
      process.env.ADMIN_PASSWORD || "admin123"
    );

    // 4. Click Sign In
    await page.click('button[type="submit"]');

    // 5. Assert redirected to /admin/dashboard
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
    expect(page.url()).toContain("/admin/dashboard");

    // 6. Take screenshot
    await page.screenshot({
      path: "screenshots/e2e-login-success.png",
      fullPage: true,
    });
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    const errorEl = await page.waitForSelector("text=Invalid credentials", {
      timeout: 10_000,
    });
    expect(errorEl).toBeTruthy();
  });
});
