import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RadMedicine \u2014 A real doctor, delivered directly.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default OG image for every marketing route that doesn't override
 * its own opengraph-image. Typography-led — the hero headline as
 * card-centered Young Serif, terracotta italic on the verb, mirroring
 * the live hero.
 *
 * Young Serif isn't bundled in the edge runtime here; the rendered
 * PNG uses system serif as a stand-in. Acceptable for Beta — social
 * previews are low-fidelity by convention and the color + layout +
 * copy do most of the work. If we want true Young Serif we'd fetch
 * the TTF from Google Fonts at render time.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#faf7f2",
          color: "#2c3e2e",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6d7b6f",
            marginBottom: 32,
          }}
        >
          Direct Primary Care &middot; Colorado
        </div>

        <div
          style={{
            fontSize: 104,
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
            fontWeight: 400,
            color: "#2c3e2e",
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <span>A real doctor,</span>
          <span style={{ color: "#c4784a", fontStyle: "italic" }}>delivered</span>
          <span>directly.</span>
        </div>

        <div
          style={{
            marginTop: 48,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 26,
            color: "#3e4f40",
            maxWidth: 900,
          }}
        >
          Colorado&apos;s marketplace for direct primary care. Find a clinic, meet your doctor, skip the runaround.
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 18,
            paddingTop: 48,
            borderTop: "1px solid #e6e0d2",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#c4784a",
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#c4784a",
              letterSpacing: "-0.025em",
            }}
          >
            Rad
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#5a8a6e",
              letterSpacing: "0.005em",
            }}
          >
            Medicine
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 18,
              color: "#a2ad9f",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            radmedicine.io
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
