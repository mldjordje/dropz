import { expect, test } from "@playwright/test";

test("public booking never offers a staff picker", async ({ page }) => {
  await page.goto("/booking");
  await page.getByRole("button", { name: /Besplatna konsultacija/i }).click();
  await expect(page.getByText(/Kod koga/i)).toHaveCount(0);
  await expect(page.locator('a[href^="/artisti"]')).toHaveCount(0);
});

test("retired artist pages permanently land on the studio portfolio", async ({ page }) => {
  await page.goto("/artisti");
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByRole("heading", { name: /Radovi\s*studija/i })).toBeVisible();
});

test("unauthenticated admin routes remain protected", async ({ page }) => {
  await page.goto("/admin/zahtevi");
  await expect(page).toHaveURL(/\/admin\/login/);
});
