import { expect, test } from "@playwright/test";

test("landing exposes the full story and conversion routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tattoo studio u Nišu/ })).toBeAttached();
  await expect(page.getByLabel("Ink is energy.")).toBeVisible();
  await expect(page.locator("#work")).toBeAttached();
  await expect(page.locator("#booking")).toBeAttached();
  await page.getByRole("button", { name: /Pošalji upit/ }).click();
  await expect(page.getByRole("link", { name: "Nastavi — pošalji upit" })).toBeVisible();
  expect(await page.locator("video source").count()).toBeGreaterThanOrEqual(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test("language switch changes the visible landing copy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByText("Precision is the only rule.")).toBeVisible();
});
