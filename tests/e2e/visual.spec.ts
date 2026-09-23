import { test, expect, type Page } from '@playwright/test';

/** Waits until the engine has answered, the 3D (if any) has drawn and the page has stopped growing. */
async function settle(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Считаем'), undefined, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  // The 3D canvases settle at their own pace: compare only once the page height holds still.
  await page.waitForFunction(() => {
    const h = document.body.scrollHeight;
    const w = window as unknown as { __h?: number; __same?: number };
    w.__same = h === w.__h ? (w.__same ?? 0) + 1 : 0;
    w.__h = h;
    return (w.__same ?? 0) >= 3;
  }, undefined, { timeout: 30_000, polling: 300 });
}

async function compare(page: Page, name: string) {
  const canvas = page.locator('canvas');
  // Everything but the 3D: strict. The 3D canvas separately, where WebGL rasterises a few pixels differently.
  await expect(page).toHaveScreenshot(`${name}.png`, { mask: [canvas], fullPage: true });
  if (await canvas.count()) await expect(canvas.first()).toHaveScreenshot(`${name}-3d.png`, { maxDiffPixels: 400, maxDiffPixelRatio: 0.03 });
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
