import Script from "next/script";

/**
 * Plausible analytics — cookie-free, no PII, no consent banner needed.
 * Chosen because it fits the RadMedicine privacy posture (we don't
 * collect PII by design) and is light enough that the marketing pages
 * don't pay a perceptible performance cost.
 *
 * Env:
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN   the domain Plausible tracks
 *                                  (e.g. "radmedicine.io")
 *   NEXT_PUBLIC_PLAUSIBLE_SRC      optional; override for self-hosted
 *                                  (defaults to script.js on plausible.io)
 *
 * If either env is unset, nothing loads — local dev stays clean.
 *
 * Custom events: use `track(name, props)` from src/lib/analytics/events.ts
 * instead of calling window.plausible directly.
 */
export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";

  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
