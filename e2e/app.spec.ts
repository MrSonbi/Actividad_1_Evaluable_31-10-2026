import { expect, test } from '@playwright/test';

test('redirige a la pantalla de acceso sin sesión', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle(/Iniciar sesión/);
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible();
});

test('declara el idioma y un punto de referencia principal', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('main')).toBeVisible();
});

test('muestra los errores de validación como alertas', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert').first()).toBeVisible();
});

test('no provoca scroll horizontal a 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test('muestra la página 404 en rutas desconocidas', async ({ page }) => {
  await page.goto('/ruta-que-no-existe');

  await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
});
