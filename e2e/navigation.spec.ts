import { test, expect } from '@playwright/test';

const routes = [
  { name: 'Dashboard', href: '/' },
  { name: 'Intake', href: '/intake' },
  { name: 'Parts', href: '/parts' },
  { name: 'Lots', href: '/lots' },
  { name: 'Locations', href: '/locations' },
  { name: 'Projects', href: '/projects' },
  { name: 'Import', href: '/import' },
];

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  for (const route of routes) {
    test(`sidebar link "${route.name}" is present`, async ({ page }) => {
      const link = page.getByRole('link', { name: route.name });
      await expect(link).toBeVisible();
    });

    test(`navigating to ${route.href} renders without error`, async ({ page }) => {
      await page.goto(route.href);

      // Verify no 404 or 500 — Next.js renders these as headings
      await expect(page.getByRole('heading', { name: /404/i })).not.toBeVisible();
      await expect(page.getByRole('heading', { name: /500/i })).not.toBeVisible();
      await expect(page.getByText(/application error/i)).not.toBeVisible();

      // Confirm URL matches expected path
      expect(new URL(page.url()).pathname).toBe(route.href);
    });

    test(`clicking sidebar link "${route.name}" navigates to ${route.href}`, async ({ page }) => {
      const link = page.getByRole('link', { name: route.name });
      await link.click();
      await page.waitForURL(url => new URL(url).pathname === route.href);
    });
  }
});
