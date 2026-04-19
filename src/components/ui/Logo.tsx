/**
 * RadMedicine Logo — ECG-network mark + split-weight wordmark.
 *
 * Ported from design-handoffs/.../logo.jsx. ECG mark SVG is preserved
 * faithfully (119×85 viewBox, 10-node waveform with R-peak hub at
 * center-top, sparse cross-network diagonals, dashed baseline).
 *
 * Editorial liberty: the handoff specifies Space Grotesk for the
 * wordmark. We use DM Sans (already loaded, 500/700 weights) to keep
 * the font payload constrained. Visual character is close enough and
 * the Rad/Medicine size + weight hierarchy is preserved.
 *
 * Variants:
 *   mark     — horizontal lockup (default; Topbar, Footer)
 *   stacked  — mark above wordmark, centered with divider
 *   monogram — mark above split-color "RM" (for square avatars, favicons)
 *   wordmark — type only, no ECG mark
 *
 * Props:
 *   size       — wordmark font-size in px; drives all other dimensions
 *   showMotto  — appends "Your Doctor is Here" as mono caption
 *   onDark     — inverts colors for sage/forest panels
 *   onForest   — further tweak when background is forest-deep
 */

type Variant = "mark" | "stacked" | "monogram" | "wordmark";

type LogoProps = {
  variant?: Variant;
  size?: number;
  showMotto?: boolean;
  onDark?: boolean;
  onForest?: boolean;
};

function ECGMark({
  scale = 1,
  onDark = false,
  onForest = false,
}: {
  scale?: number;
  onDark?: boolean;
  onForest?: boolean;
}) {
  const edge = onDark ? "var(--bg)" : "var(--primary)";
  const edgeOp = onDark ? 0.85 : 0.62;
  const crossOp = onDark ? 0.35 : 0.26;
  const hub = "var(--accent)";
  const hubInner = onDark ? (onForest ? "var(--forest)" : "var(--primary)") : "var(--bg)";
  const sage = onDark ? "var(--bg)" : "var(--primary)";

  const w = 119 * scale;
  const h = 85 * scale;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 119 85"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <line x1="10" y1="53" x2="109" y2="53" stroke={sage} strokeWidth="1" strokeDasharray="2,5" opacity="0.22" />
      <g stroke={edge} strokeWidth="1.6" strokeLinecap="round" opacity={edgeOp}>
        <line x1="10" y1="53" x2="25" y2="53" />
        <line x1="25" y1="53" x2="34" y2="41" />
        <line x1="34" y1="41" x2="42" y2="53" />
        <line x1="42" y1="53" x2="46" y2="59" />
        <line x1="46" y1="59" x2="54" y2="8" />
        <line x1="54" y1="8" x2="60" y2="71" />
        <line x1="60" y1="71" x2="67" y2="53" />
        <line x1="67" y1="53" x2="79" y2="38" />
        <line x1="79" y1="38" x2="88" y2="53" />
        <line x1="88" y1="53" x2="109" y2="53" />
      </g>
      <g stroke={edge} strokeWidth="1" strokeLinecap="round" opacity={crossOp}>
        <line x1="25" y1="53" x2="42" y2="53" />
        <line x1="34" y1="41" x2="46" y2="59" />
        <line x1="25" y1="53" x2="67" y2="53" />
        <line x1="42" y1="53" x2="60" y2="71" />
        <line x1="67" y1="53" x2="88" y2="53" />
        <line x1="54" y1="8" x2="67" y2="53" />
        <line x1="79" y1="38" x2="88" y2="53" />
      </g>
      <circle cx="10" cy="53" r="3" fill={sage} />
      <circle cx="25" cy="53" r="3.5" fill={sage} />
      <circle cx="34" cy="41" r="4.5" fill={hub} />
      <circle cx="42" cy="53" r="3" fill={sage} />
      <circle cx="46" cy="59" r="3" fill={sage} />
      <circle cx="54" cy="8" r="8" fill={hub} />
      <circle cx="54" cy="8" r="3.5" fill={hubInner} />
      <circle cx="60" cy="71" r="3.5" fill={sage} />
      <circle cx="67" cy="53" r="3" fill={sage} />
      <circle cx="79" cy="38" r="3.5" fill={sage} />
      <circle cx="88" cy="53" r="3" fill={sage} />
      <circle cx="109" cy="53" r="3" fill={sage} />
    </svg>
  );
}

export function Logo({
  variant = "mark",
  size = 28,
  showMotto = false,
  onDark = false,
  onForest = false,
}: LogoProps) {
  const radColor = "var(--accent)";
  const medColor = onDark ? "var(--bg)" : "var(--primary)";
  const mottoColor = onDark ? "var(--bg)" : "var(--ink)";
  const wordmarkFont = "var(--sans)";

  if (variant === "stacked") {
    const markScale = (size * 2.3) / 85;
    const medSize = size * 0.66;
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: size * 0.22 }}>
        <ECGMark scale={markScale} onDark={onDark} onForest={onForest} />
        <span
          style={{
            width: "62%",
            height: 1,
            background: onDark ? "rgba(250,247,242,.25)" : "rgba(90,138,110,.25)",
          }}
        />
        <span
          style={{
            fontFamily: wordmarkFont,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginTop: 4,
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontWeight: 700, color: radColor, fontSize: size, letterSpacing: "-0.025em" }}>Rad</span>
          <span
            style={{
              fontWeight: 500,
              color: medColor,
              fontSize: medSize,
              marginLeft: size * 0.08,
              letterSpacing: "0.005em",
            }}
          >
            Medicine
          </span>
        </span>
        {showMotto && (
          <span
            style={{
              fontFamily: wordmarkFont,
              fontWeight: 300,
              fontSize: size * 0.42,
              letterSpacing: "0.12em",
              color: mottoColor,
              opacity: onDark ? 0.62 : 0.45,
            }}
          >
            Your Doctor is Here
          </span>
        )}
      </span>
    );
  }

  if (variant === "monogram") {
    const markScale = (size * 2.6) / 85;
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: size * 0.18 }}>
        <ECGMark scale={markScale} onDark={onDark} onForest={onForest} />
        <span
          style={{
            width: "58%",
            height: 1,
            background: onDark ? "rgba(250,247,242,.2)" : "rgba(90,138,110,.2)",
          }}
        />
        <span style={{ fontFamily: wordmarkFont, fontSize: size * 1.45, letterSpacing: "-0.01em", lineHeight: 1 }}>
          <span style={{ fontWeight: 700, color: radColor }}>R</span>
          <span style={{ fontWeight: 500, color: medColor }}>M</span>
        </span>
      </span>
    );
  }

  if (variant === "wordmark") {
    const medSize = size * 1.1 * 0.66;
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
        <span
          style={{
            fontFamily: wordmarkFont,
            letterSpacing: "-0.025em",
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontWeight: 700, color: radColor, fontSize: size * 1.1, letterSpacing: "-0.03em" }}>Rad</span>
          <span
            style={{
              fontWeight: 500,
              color: medColor,
              fontSize: medSize,
              marginLeft: size * 0.085,
              letterSpacing: "0.005em",
            }}
          >
            Medicine
          </span>
        </span>
        {showMotto && (
          <span
            style={{
              fontFamily: wordmarkFont,
              fontWeight: 300,
              fontSize: size * 0.44,
              letterSpacing: "0.12em",
              color: mottoColor,
              opacity: onDark ? 0.62 : 0.48,
            }}
          >
            Your Doctor is Here
          </span>
        )}
      </span>
    );
  }

  // mark (default)
  const markScale = (size * 1.28) / 85;
  const medSize = size * 0.66;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.2, lineHeight: 1 }}>
      <ECGMark scale={markScale} onDark={onDark} onForest={onForest} />
      <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: wordmarkFont,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontWeight: 700, color: radColor, fontSize: size, letterSpacing: "-0.025em" }}>Rad</span>
          <span
            style={{
              fontWeight: 500,
              color: medColor,
              fontSize: medSize,
              marginLeft: size * 0.08,
              letterSpacing: "0.005em",
            }}
          >
            Medicine
          </span>
        </span>
        {showMotto && (
          <span
            style={{
              fontFamily: wordmarkFont,
              fontWeight: 300,
              fontSize: size * 0.42,
              letterSpacing: "0.11em",
              color: mottoColor,
              opacity: onDark ? 0.62 : 0.48,
              marginTop: 2,
            }}
          >
            Your Doctor is Here
          </span>
        )}
      </span>
    </span>
  );
}
