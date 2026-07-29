import { test, expect } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
  });

  test("should display metric cards", async ({ page }) => {
    // Assert the dashboard heading
    await expect(page.locator("h1")).toContainText("Dashboard");

    // Assert metric cards are visible (Tickets Today, Resolved Today, Active Agents, Pending Permissions)
    await expect(page.locator("text=Tickets Today")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Resolved Today")).toBeVisible();
    await expect(page.locator("text=Active Agents")).toBeVisible();
    await expect(page.locator("text=Pending Permissions")).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "screenshots/e2e-dashboard-metrics.png",
      fullPage: true,
    });
  });

  test("should display support agents status section", async ({ page }) => {
    await expect(page.locator("text=Support Agents Status")).toBeVisible({
      timeout: 10_000,
    });

    await page.screenshot({
      path: "screenshots/e2e-dashboard-agents.png",
      fullPage: true,
    });
  });
});
