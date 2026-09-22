import { test, expect, type Page } from '@playwright/test';

/** Waits until the engine has answered and the 3D (if any) has drawn. */
async function settle(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Считаем'), undefined, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

async function compare(page: Page, name: string) {
  const canvas = page.locator('canvas');
  // Everything but the 3D: strict. The 3D canvas separately, with the 3 % budget for WebGL rasterisation.
  await expect(page).toHaveScreenshot(`${name}.png`, { mask: [canvas], fullPage: true });
  if (await canvas.count()) await expect(canvas.first()).toHaveScreenshot(`${name}-3d.png`, { maxDiffPixelRatio: 0.03 });
}

test('room', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  await compare(page, 'room');
});

test('how it works', async ({ page }) => {
  await page.goto('/#method');
  await settle(page);
  await compare(page, 'method');
});

test('physics check', async ({ page }) => {
  await page.goto('/#physics');
  await settle(page);
  await compare(page, 'physics');
});

test('walls mode, L-shaped room', async ({ page, isMobile }) => {
  await page.goto('/');
  await settle(page);
  if (isMobile) {
    await page.getByRole('button', { name: 'Меню' }).click();
    await page.getByRole('button', { name: 'Изменить форму комнаты' }).click();
  } else {
    await page.getByRole('button', { name: 'Стены', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Г', exact: true }).click();
  await page.waitForTimeout(1500);
  await compare(page, 'walls');
});
