import { expect, test } from "@playwright/test";

test("landing exposes the full story and conversion routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "INK IS ENERGY." })).toBeVisible();
  await expect(page.locator("#work")).toBeAttached();
  await expect(page.locator('a[href="/booking"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="/upit"]')).toHaveCount(1);
  await expect(page.locator("video source")).toHaveCount(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("language switch changes the visible landing copy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByText("We simply guide the line.")).toBeVisible();
});
