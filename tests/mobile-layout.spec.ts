import { test, expect } from '@playwright/test';

const MOBILE_WIDTHS = [375, 390, 430] as const;

for (const width of MOBILE_WIDTHS) {
  test.describe(`mobile layout @${width}px`, () => {
    test.use({ viewport: { width, height: 812 } });

    test(`landing header and navigation sheet`, async ({ page }) => {
      await page.goto('/');

      // Header should not overflow viewport width
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      const headerBox = await header.boundingBox();
      expect(headerBox?.width || 0).toBeLessThanOrEqual(width + 1);

      // Mobile menu icon should be visible and clickable
      const menuButton = page.getByTestId('mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      // Marketing nav items should be visible in the sheet
      await expect(page.getByText('Home')).toBeVisible();
      await expect(page.getByText('Features')).toBeVisible();
      await expect(page.getByText('Demo')).toBeVisible();
      await expect(page.getByText('Pricing')).toBeVisible();
      await expect(page.getByText('Sign In')).toBeVisible();
      await expect(page.getByText('Get Started')).toBeVisible();

      // Visual snapshot for regression
      await expect(page).toHaveScreenshot(`landing-${width}.png`, { fullPage: true });
    });

    test(`dashboard header, net worth card, and unit toggle`, async ({ page }) => {
      await page.goto('/dashboard');

      // Header should render within viewport
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      const headerBox = await header.boundingBox();
      expect(headerBox?.width || 0).toBeLessThanOrEqual(width + 1);

      // Mobile menu icon present
      const menuButton = page.getByTestId('mobile-menu-button');
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      // Close again to avoid blocking content
      await page.keyboard.press('Escape').catch(() => {});

      // Net worth card should not overflow horizontally
      const netWorthCard = page.getByTestId('dashboard-net-worth-card');
      await expect(netWorthCard).toBeVisible();
      const cardBox = await netWorthCard.boundingBox();
      expect(cardBox?.x || 0).toBeGreaterThanOrEqual(0);
      expect((cardBox?.x || 0) + (cardBox?.width || 0)).toBeLessThanOrEqual(width + 1);

      // Currency segmented control should fit cleanly
      const unitToggle = page.getByTestId('unit-toggle-mobile');
      await expect(unitToggle).toBeVisible();
      const toggleBox = await unitToggle.boundingBox();
      expect(toggleBox?.x || 0).toBeGreaterThanOrEqual(0);
      expect((toggleBox?.x || 0) + (toggleBox?.width || 0)).toBeLessThanOrEqual(width + 1);

      // Visual snapshot for regression
      await expect(page).toHaveScreenshot(`dashboard-${width}.png`, { fullPage: true });
    });
  });
}

