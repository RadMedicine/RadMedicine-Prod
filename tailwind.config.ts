import type { Config } from "tailwindcss";

/**
 * Tailwind theme is wired to CSS custom properties defined in
 * src/styles/tokens.css. NEVER duplicate hex values here — tokens.css is
 * the visual source of truth. See app/CLAUDE.md § Design system.
 *
 * Scope of this config:
 *   - colors — named tokens (primary, accent, ink, etc.) resolve to var(--*).
 *   - fontFamily — overrides sans/serif/mono defaults so Tailwind Preflight
 *     picks up the design-system faces.
 *
 * Spacing, radii, and shadows are intentionally NOT overridden. For token
 * spacing / radii / shadows use tokens.css classes (.wrap, .card, .btn) or
 * arbitrary-value escapes (`p-[var(--s-6)]`, `rounded-[var(--r-2)]`,
 * `shadow-[var(--shadow-md)]`). This preserves Tailwind's default numeric
 * scale for general layout work.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-deep": "var(--bg-deep)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        rule: "var(--rule)",
        "rule-2": "var(--rule-2)",
        primary: "var(--primary)",
        "primary-2": "var(--primary-2)",
        "primary-ink": "var(--primary-ink)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-soft": "var(--accent-soft)",
        forest: "var(--forest)",
        "forest-deep": "var(--forest-deep)",
        danger: "var(--danger)",
        good: "var(--good)",
      },
      fontFamily: {
        sans: "var(--sans)",
        display: "var(--display)",
        serif: "var(--serif)",
        "display-italic": "var(--display-italic)",
        mono: "var(--mono)",
      },
      maxWidth: {
        wrap: "var(--maxw)",
      },
    },
  },
  plugins: [],
};

export default config;
