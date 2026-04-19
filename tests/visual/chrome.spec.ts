import { expect, test } from "@playwright/test";

/**
 * Marketing chrome visual canaries — Topbar and Footer.
 *
 * Like the hero test, these exist so a font-loading or tokens.css
 * regression lights up a red diff before a PR merges. The Topbar is
 * especially sensitive because it renders the Logo (the DM Sans
 * wordmark substitution is documented in app/CLAUDE.md § Design
 * system — a regression there would break the brand lockup).
 *
 * Both snapshots are taken from / since it's the only route that
 * always renders in the visual-regression environment (safe()
 * fallbacks cover missing DB).
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready;
    }
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    `,
  });
});

test("topbar is pixel-stable", async ({ page }) => {
  const topbar = page.getByTestId("topbar");
  await expect(topbar).toBeVisible();
  await expect(topbar).toHaveScreenshot("topbar.png");
});

test("footer is pixel-stable", async ({ page }) => {
  const footer = page.getByTestId("footer");
  // Scroll into view so the footer renders fully before the snapshot.
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(footer).toHaveScreenshot("footer.png");
});
