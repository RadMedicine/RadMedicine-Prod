import Link from "next/link";
import type { Metadata } from "next";

/**
 * Clinic Landing — B2B pitch to DPC doctors.
 *
 * Wireframe quality per PROJECT_PLAN Workstream C #1: structure and
 * tokens correct, not pixel-perfect. Content and section order from
 * the design handoff (pages-set1.jsx ClinicLanding). "See pricing"
 * CTA dropped — Pricing page is cut for Beta; single primary CTA
 * routes to /clinic/onboarding.
 */

export const metadata: Metadata = {
  title: "For clinics — RadMedicine",
  description:
    "Patient Acquisition as a Service for Direct Primary Care clinics. No upfront cost. We only get paid when your panel grows.",
};

const VS_ROWS: [string, string][] = [
  ["Generic marketing agencies", "Lack DPC-specific expertise and patient education"],
  ["Pay-per-click lead gen", "Unqualified leads — we deliver subscription-ready patients"],
  ["Admin platforms", "Focus on operations, not growth acceleration"],
  ["Competing networks", "Control your patients — we support your independence"],
  ["DIY marketing", "Demands your clinical time — we handle everything"],
];

const STEPS: [string, string, string][] = [
  ["01", "We learn your practice", "Ideal patient profile, care philosophy, capacity goals, unique value."],
  [
    "02",
    "We build your pipeline",
    "Comprehensive campaigns, educational outreach, intelligent matching — managed on your behalf.",
  ],
  ["03", "You focus on care", "Receive well-matched, subscription-ready patients who understand DPC."],
];

export default function ForClinicsPage() {
  return (
    <>
      {/* Page header */}
      <section style={{ padding: "var(--s-8) 0 var(--s-7)", borderBottom: "1px solid var(--rule)" }}>
        <div className="wrap">
          <p className="t-eyebrow" style={{ marginBottom: 14 }}>
            For clinics
          </p>
          <h1 className="t-h1" style={{ margin: 0, maxWidth: 780 }}>
            You became a doctor to practice medicine — <em>not marketing</em>.
          </h1>
          <p className="t-body-lg" style={{ marginTop: "var(--s-4)", maxWidth: 680 }}>
            Patient Acquisition as a Service. No upfront cost. We only get paid when your panel grows.
          </p>
        </div>
      </section>

      {/* Hero value prop + dashboard preview */}
      <section style={{ padding: "var(--s-7) 0" }}>
        <div
          className="wrap"
          style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--s-7)", alignItems: "start" }}
        >
          <div>
            <h2
              className="t-h2"
              style={{ margin: 0, fontSize: "clamp(30px, 3.2vw, 44px)", maxWidth: 560 }}
            >
              Predictable panel growth, <em>without the marketing</em>.
            </h2>
            <div style={{ display: "flex", gap: "var(--s-3)", marginTop: "var(--s-5)", flexWrap: "wrap" }}>
              <Link href="/clinic/onboarding" className="btn btn-primary">
                Schedule consultation
              </Link>
              <Link href="#how" className="btn btn-ghost">
                How it works
              </Link>
            </div>
            <div
              style={{
                marginTop: "var(--s-6)",
                paddingTop: "var(--s-5)",
                borderTop: "1px solid var(--rule)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-4)",
              }}
            >
              {[
                ["0", "upfront cost"],
                ["$0", "per lead"],
                ["Pay", "only on enrollment"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "var(--display)", fontSize: 32, color: "var(--primary)", lineHeight: 1 }}>
                    {n}
                  </div>
                  <div className="t-small" style={{ marginTop: 6 }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview placeholder — a growth-chart SVG with 3 metric tiles.
              Not the final data viz; just shows what the clinic dashboard will feel like. */}
          <aside
            className="card"
            aria-label="Clinic dashboard preview"
            style={{ padding: "var(--s-5)" }}
          >
            <p className="t-eyebrow" style={{ marginBottom: "var(--s-3)" }}>
              Dashboard preview
            </p>
            <svg viewBox="0 0 300 200" width="100%" height="200" role="presentation">
              <path
                d="M10 170 Q 60 150 100 130 T 200 70 T 290 30"
                stroke="var(--primary)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M10 170 Q 60 150 100 130 T 200 70 T 290 30 L 290 190 L 10 190 Z"
                fill="var(--accent-soft)"
                opacity="0.5"
              />
              {[30, 80, 130, 180, 230, 280].map((x, i) => (
                <circle key={x} cx={x} cy={170 - i * 25} r="3" fill="var(--primary)" />
              ))}
            </svg>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-2)",
                marginTop: "var(--s-3)",
              }}
            >
              {[
                ["+24", "This month"],
                ["412", "Total"],
                ["96%", "Retention"],
              ].map(([n, l]) => (
                <div
                  key={l}
                  style={{
                    padding: 10,
                    background: "var(--bg-deep)",
                    borderRadius: "var(--r-1)",
                  }}
                >
                  <div style={{ fontFamily: "var(--display)", fontSize: 20, color: "var(--primary)", lineHeight: 1 }}>
                    {n}
                  </div>
                  <div className="t-mono" style={{ fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>
                    {l.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Why RadMedicine */}
      <section style={{ padding: "var(--s-8) 0", background: "var(--bg-deep)" }}>
        <div className="wrap">
          <p className="t-eyebrow">Vs. everything else</p>
          <h2 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-6)" }}>
            Why RadMedicine
          </h2>
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--r-3)",
              overflow: "hidden",
            }}
          >
            {VS_ROWS.map(([alt, pitch], i) => (
              <div
                key={alt}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  padding: "22px 28px",
                  borderBottom: i < VS_ROWS.length - 1 ? "1px solid var(--rule)" : "none",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div style={{ color: "var(--ink-3)", fontSize: 15 }}>{alt}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.3 }}>
                  {pitch}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three-step process */}
      <section id="how" style={{ padding: "var(--s-8) 0" }}>
        <div className="wrap">
          <p className="t-eyebrow">Three-step process</p>
          <h2 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-7)" }}>
            How we grow your panel
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-5)" }}>
            {STEPS.map(([num, title, body]) => (
              <article key={num} className="card">
                <p className="t-mono" style={{ color: "var(--accent-2)", marginBottom: 12 }}>
                  Step {num}
                </p>
                <h3
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 22,
                    letterSpacing: "-0.015em",
                    marginBottom: 8,
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
                <p className="t-body" style={{ marginTop: "var(--s-3)" }}>
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section style={{ padding: "var(--s-8) 0 var(--s-10)" }}>
        <div className="wrap">
          <div
            style={{
              background: "var(--primary)",
              color: "var(--primary-ink)",
              borderRadius: "var(--r-3)",
              padding: "var(--s-7)",
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "var(--s-6)",
              alignItems: "center",
            }}
          >
            <h2
              className="t-h2"
              style={{ margin: 0, color: "var(--primary-ink)", maxWidth: 620 }}
            >
              Let&apos;s build predictable growth for your DPC practice.
            </h2>
            <Link
              href="/clinic/onboarding"
              className="btn btn-accent btn-lg"
              style={{ justifySelf: "end" }}
            >
              Schedule a consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
