import { test, expect } from "@playwright/test";

test.describe("Tickets Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });

    // Navigate to tickets
    await page.goto("/admin/tickets");
    await page.waitForSelector("h1");
  });

  test("should render the tickets page", async ({ page }) => {
    // Assert the page heading
    await expect(page.locator("h1")).toContainText("All Tickets");

    // Assert search input is present
    await expect(page.locator('input[placeholder="Search tickets..."]')).toBeVisible();

    // Assert filter dropdown is present
    await expect(page.locator("select")).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "screenshots/e2e-tickets-page.png",
      fullPage: true,
    });
  });

  test("should display tickets table", async ({ page }) => {
    // Assert table headers exist
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    const headers = ["ID", "Customer", "Subject", "Status", "Priority", "Assigned To", "Created", "Actions"];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }

    await page.screenshot({
      path: "screenshots/e2e-tickets-table.png",
      fullPage: true,
    });
  });
});
