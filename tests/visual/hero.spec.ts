import { expect, test } from "@playwright/test";

/**
 * Patient Landing hero — visual canary.
 *
 * This test exists because of CLAUDE.md critical rule #2: the
 * terracotta <em> treatment depends on Young Serif having no italic,
 * causing <em> to fall through to Source Serif 4 italic via
 * var(--display-italic). A font-loading refactor that accidentally
 * synthesizes italic from Young Serif will render a warped sans-ish
 * italic, which this snapshot catches.
 *
 * The hero also reflects the Logo (DM Sans wordmark), the Topbar, and
 * the tokens.css palette — so any visual regression there will trip
 * the same test.
 */

test("patient landing hero is pixel-stable", async ({ page }) => {
  await page.goto("/");

  // Wait for the display font to load before snapshotting, otherwise
  // the first render flashes fallback Georgia.
  await page.evaluate(async () => {
    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready;
    }
  });

  // Freeze animations/transitions to keep the snapshot deterministic.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    `,
  });

  const hero = page.getByTestId("hero");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveScreenshot("hero.png");
});
