// Behaviour, not pictures: the ready-made rooms, the shelf над кроватью warning and moving the bed to safety.
import { test, expect, type Page } from '@playwright/test';

async function settle(page: Page) {
  await page.waitForFunction(() => !document.body.innerText.includes('Считаем'), undefined, { timeout: 60_000 });
}

test('moving the bed out of the fall zones', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  const move = page.getByRole('button', { name: 'Переставить кровать сюда' });
  await expect(move).toBeVisible();
  await expect(page.getByText('Кровать стоит в зоне падения')).toBeVisible();
  await move.click();
  await settle(page);
  // Once the bed stands clear there is nothing left to suggest.
  await expect(page.getByText('Кровать стоит в зоне падения')).toHaveCount(0);
});

test('the child room warns about the shelf above the bed', async ({ page }) => {
  await page.goto('/');
  await settle(page);
  // On the phone the room picker sits on the plan, so open it first.
  const plan = page.getByRole('button', { name: 'План', exact: true });
  if (await plan.count()) await plan.click();
  await page.locator('select').filter({ hasText: 'Детская' }).first().selectOption('kids-room');
  // The summary with the warning lives on the 3D view, so go back there on the phone.
  const back3d = page.getByRole('button', { name: '3D', exact: true });
  if (await back3d.count()) await back3d.click();
  await settle(page);
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Над кроватью висит');
  await expect(alert).toContainText('прямо на спящего');
});
