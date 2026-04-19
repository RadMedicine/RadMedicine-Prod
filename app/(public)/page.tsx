import Link from "next/link";
import type { Metadata } from "next";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Patient Landing — hi-fi port of the handoff's page-patient-landing.jsx.
 * Voice, claims, and eyebrows follow marketing/positioning-brief.md:
 *   - Colorado-only framing (Beta)
 *   - Hero headline: "A real doctor, delivered directly." (italic on the verb)
 *   - Subhead from brief §7
 *   - No anti-insurance copy; insurance is the foil, not the adversary
 *   - No dollar-savings claims
 *   - No fake testimonials — section omitted until real quotes land
 *     (positioning-brief.md §11 open question #4)
 *
 * Data: specialties, featured doctors, and the stat strip all read from
 * the `core` schema. Before `npm run db:seed`, the landing renders but
 * with empty cards and zero counts.
 */
export default async function HomePage() {
  // Graceful fallbacks: if any DB query fails (unreachable Supabase,
  // wrong DATABASE_URL, whatever) the hero still renders. This is
  // useful for visual regression and for surviving transient DB
  // outages in production without 500-ing the marketing surface.
  const [specialties, featured, clinicCount, avgPriceCents] = await Promise.all([
    safe(getSpecialtiesWithCounts, [] as SpecialtyRow[]),
    safe(() => getFeaturedDoctors(3), [] as FeaturedRow[]),
    safe(getVisibleClinicCount, 0),
    safe(getAverageAdultPrice, null as number | null),
  ]);

  return (
    <>
      {/* HERO */}
      <section data-testid="hero" style={{ position: "relative", padding: "var(--s-8) 0 var(--s-6)", overflow: "hidden" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 120,
            right: "6%",
            width: 180,
            height: 180,
            opacity: 0.15,
            pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 180 180" width="100%" height="100%">
            <circle cx="90" cy="90" r="88" fill="none" stroke="var(--primary)" strokeWidth="1" />
            <circle cx="90" cy="90" r="60" fill="none" stroke="var(--primary)" strokeWidth="1" />
            <circle cx="90" cy="90" r="30" fill="none" stroke="var(--primary)" strokeWidth="1" />
            <path d="M90 0 V180 M0 90 H180" stroke="var(--primary)" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 64, alignItems: "end" }}>
          <div>
            <div
              className="t-eyebrow"
              style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ width: 24, height: 1, background: "var(--ink-3)" }} />
              Direct Primary Care &middot; Colorado
            </div>
            <h1 className="t-display" style={{ margin: 0 }}>
              A real doctor,
              <br />
              <em>delivered</em> directly.
            </h1>
            <p className="t-body-lg" style={{ maxWidth: 560, marginTop: 28 }}>
              Colorado&apos;s marketplace for direct primary care. Find a clinic, meet your doctor, skip the runaround.
            </p>

            <form
              action="/search"
              style={{
                marginTop: 36,
                background: "var(--bg-elev)",
                border: "1px solid var(--rule-2)",
                borderRadius: 14,
                padding: 6,
                display: "flex",
                gap: 6,
                boxShadow: "var(--shadow-md)",
                maxWidth: 620,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  flex: "1 1 55%",
                  borderRight: "1px solid var(--rule)",
                }}
              >
                <span aria-hidden style={{ color: "var(--ink-3)" }}>&#9679;</span>
                <input
                  name="zip"
                  placeholder="Colorado ZIP or city"
                  style={{
                    border: 0,
                    outline: 0,
                    background: "transparent",
                    fontFamily: "var(--sans)",
                    fontSize: 15,
                    flex: 1,
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", flex: "1 1 35%" }}>
                <select
                  name="specialty"
                  defaultValue=""
                  style={{
                    border: 0,
                    outline: 0,
                    background: "transparent",
                    fontFamily: "var(--sans)",
                    fontSize: 15,
                    flex: 1,
                    color: "var(--ink)",
                    appearance: "none",
                  }}
                >
                  <option value="">Specialty (optional)</option>
                  {specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>

            <div style={{ display: "flex", gap: 24, marginTop: 22, flexWrap: "wrap" }}>
              <span className="chip chip-dot">
                <span>
                  {clinicCount} Colorado {clinicCount === 1 ? "clinic" : "clinics"} accepting patients
                </span>
              </span>
              <span className="t-small">Pairs with your insurance</span>
              <span className="t-small">Cancel anytime</span>
            </div>
          </div>

          {/* Hero card: doctor preview */}
          <HeroCard featured={featured[0] ?? null} />
        </div>
      </section>

      <div style={{ height: 80 }} />

      {/* Ticker */}
      <TickerStrip
        items={[
          `${clinicCount} CO DPC CLINICS`,
          avgPriceCents != null ? `AVG $${(avgPriceCents / 100).toFixed(0)}/MO MEMBERSHIP` : "TRANSPARENT MEMBERSHIP PRICING",
          "SAME-WEEK APPOINTMENTS",
          "NO COPAYS ON INCLUDED VISITS",
          "CANCEL ANYTIME",
          "PAIRS WITH INSURANCE",
        ]}
      />

      {/* § 01 — THE MODEL */}
      <section style={{ padding: "var(--s-9) 0" }}>
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 80, alignItems: "start" }}>
            <div style={{ position: "sticky", top: 100 }}>
              <div className="t-eyebrow">&sect; 01 &mdash; The model</div>
              <h2 className="t-h1" style={{ marginTop: 18 }}>
                Healthcare, <em>delivered directly</em>.
              </h2>
            </div>
            <div>
              <p className="t-body-lg" style={{ marginTop: 0 }}>
                Direct primary care is a subscription. You pay your doctor directly &mdash; a flat monthly fee &mdash;
                and in return you get their time, their number, their calendar. No insurance billing for your primary
                care. No copays on the included visits. No 15-minute cap on a conversation about your knee.
              </p>
              <div style={{ marginTop: 40, borderTop: "1px solid var(--rule)" }}>
                {[
                  ["Flat monthly fee", "Typically $60\u2013$150/month in Colorado. Covers visits, messaging, and most in-office procedures."],
                  ["Direct access", "Text, call, or video your doctor the same day. No phone trees. No gatekeepers."],
                  ["Smaller panels", "DPC doctors cap their panels around 400\u2013800 patients, not 2,000+. They remember you."],
                  ["Pairs with insurance", "Keep a high-deductible or catastrophic plan for hospitalization, surgery, and specialist care."],
                ].map(([h, b], i) => (
                  <div
                    key={h}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 2fr",
                      gap: 24,
                      padding: "28px 0",
                      borderBottom: "1px solid var(--rule)",
                      alignItems: "baseline",
                    }}
                  >
                    <div className="t-mono" style={{ color: "var(--accent-2)" }}>0{i + 1}</div>
                    <div style={{ fontFamily: "var(--display)", fontSize: 24, letterSpacing: "-0.015em" }}>{h}</div>
                    <div className="t-body">{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* § 02 — SPECIALTIES */}
      <section style={{ padding: "var(--s-8) 0", background: "var(--bg-deep)" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <div className="t-eyebrow">&sect; 02 &mdash; Browse</div>
              <h2 className="t-h2" style={{ marginTop: 12 }}>
                By specialty
              </h2>
            </div>
            <Link
              href="/search"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--primary)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              See all Colorado clinics &rarr;
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              border: "1px solid var(--rule)",
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--bg-elev)",
            }}
          >
            {specialties.map((s, i) => (
              <Link
                key={s.slug}
                href={`/search?specialty=${s.slug}`}
                style={{
                  padding: "28px",
                  borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--rule)" : "none",
                  borderBottom: i < specialties.length - 3 ? "1px solid var(--rule)" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "var(--ink)",
                  textDecoration: "none",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: "-0.015em" }}>{s.name}</div>
                  <div className="t-small" style={{ marginTop: 4 }}>
                    {s.doctorCount} {s.doctorCount === 1 ? "doctor" : "doctors"}
                  </div>
                </div>
                <span aria-hidden style={{ color: "var(--ink-3)" }}>&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* § 03 — FEATURED DOCTORS */}
      <section style={{ padding: "var(--s-9) 0" }}>
        <div className="wrap">
          <div style={{ marginBottom: 40, maxWidth: 600 }}>
            <div className="t-eyebrow">&sect; 03 &mdash; Featured</div>
            <h2 className="t-h2" style={{ marginTop: 12 }}>
              Accepting patients this week
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {featured.map((d, i) => (
              <Link
                key={d.slug}
                href={`/doctors/${d.slug}`}
                className="card"
                style={{ padding: 0, overflow: "hidden", display: "block", textDecoration: "none", color: "inherit" }}
              >
                <DoctorPhoto label={`${d.displayName} \u00B7 clinic photo`} tone={TONES[i % TONES.length]} />
                <div style={{ padding: 22 }}>
                  <div className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 4 }}>
                    {(d.specialty ?? "").toUpperCase()} &middot; {d.city.toUpperCase()}, {d.region}
                  </div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: "-0.015em", marginBottom: 10 }}>
                    {d.displayName}
                  </div>
                  {d.philosophy && (
                    <p className="t-small" style={{ color: "var(--ink-2)", fontStyle: "italic" }}>
                      &ldquo;{d.philosophy}&rdquo;
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid var(--rule)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontFamily: "var(--display)", fontSize: 20, color: "var(--primary)" }}>
                      {d.priceAdultCents != null ? (
                        <>
                          ${(d.priceAdultCents / 100).toFixed(0)}
                          <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>/mo</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>Pricing on profile</span>
                      )}
                    </div>
                    <span className="chip chip-dot">Accepting</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* § 04 — HOW IT WORKS */}
      <section style={{ padding: "var(--s-9) 0", background: "var(--primary)", color: "var(--primary-ink)" }}>
        <div className="wrap">
          <div style={{ maxWidth: 700, marginBottom: 64 }}>
            <div className="t-eyebrow" style={{ color: "var(--accent)" }}>
              &sect; 04 &mdash; How it works
            </div>
            <h2 className="t-h1" style={{ color: "var(--primary-ink)", marginTop: 18 }}>
              Three steps. <em>A doctor</em> for life.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid rgba(255,255,255,.2)" }}>
            {[
              ["Discover", "Browse Colorado DPC clinics by ZIP, specialty, and who's accepting patients."],
              ["Compare", "Transparent monthly pricing, panel size, availability, and what's included. Listed up front."],
              ["Subscribe", "Enroll in minutes. Most new members are texting their new doctor by the afternoon."],
            ].map(([h, b], i) => (
              <div
                key={h}
                style={{
                  padding: "40px 32px 32px",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,.2)" : "none",
                }}
              >
                <div className="t-mono" style={{ color: "var(--accent)", marginBottom: 20 }}>
                  Step 0{i + 1}
                </div>
                <div style={{ fontFamily: "var(--display)", fontSize: 40, letterSpacing: "-0.02em", marginBottom: 14 }}>
                  {h}
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,.75)", margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTE: handoff §5 testimonial section omitted — no real member
          testimonials yet (positioning-brief.md §11 open question #4). */}

      {/* § 05 — CTA */}
      <section style={{ padding: "var(--s-8) 0 var(--s-10)" }}>
        <div className="wrap">
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--rule)",
              borderRadius: 18,
              padding: "64px 48px",
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 48,
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 340, height: 340, opacity: 0.07 }}>
              <svg viewBox="0 0 340 340" width="100%" height="100%">
                <circle cx="170" cy="170" r="168" fill="none" stroke="var(--primary)" strokeWidth="1" />
                <circle cx="170" cy="170" r="110" fill="none" stroke="var(--primary)" strokeWidth="1" />
                <circle cx="170" cy="170" r="52" fill="none" stroke="var(--primary)" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <h2 className="t-h1" style={{ margin: 0 }}>
                Ready to meet
                <br />
                <em>your</em> new doctor?
              </h2>
              <p className="t-body-lg" style={{ marginTop: 20, maxWidth: 440 }}>
                Tell us your Colorado ZIP. We&apos;ll match you with DPC clinics near you &mdash; listed pricing, real
                availability, no surprises.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link href="/onboarding" className="btn btn-primary btn-lg" style={{ justifyContent: "center", width: "100%" }}>
                Find a doctor in Colorado
              </Link>
              <p className="t-small" style={{ textAlign: "center", marginTop: 8, color: "var(--ink-3)" }}>
                No account needed to browse. Free to search.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ------- data helpers (server-only) ----------------------------------------

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[home] data fetch failed, falling back:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

type SpecialtyRow = { slug: string; name: string; doctorCount: number };
type FeaturedRow = Awaited<ReturnType<typeof getFeaturedDoctors>>[number];

async function getSpecialtiesWithCounts(): Promise<SpecialtyRow[]> {
  const rows = await coreDb
    .select({
      slug: core.specialties.slug,
      name: core.specialties.name,
      displayOrder: core.specialties.displayOrder,
      doctorCount: count(core.doctors.id),
    })
    .from(core.specialties)
    .leftJoin(
      core.doctors,
      and(eq(core.doctors.specialtyId, core.specialties.id), eq(core.doctors.accepting, true)),
    )
    .groupBy(core.specialties.id, core.specialties.slug, core.specialties.name, core.specialties.displayOrder)
    .orderBy(core.specialties.displayOrder)
    .limit(6);

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    doctorCount: Number(r.doctorCount ?? 0),
  }));
}

async function getFeaturedDoctors(limit: number) {
  const rows = await coreDb
    .select({
      slug: core.doctors.slug,
      displayName: core.doctors.displayName,
      philosophy: core.doctors.philosophy,
      priceAdultCents: core.doctors.priceAdultCents,
      specialty: core.specialties.name,
      city: core.clinics.city,
      region: core.clinics.region,
    })
    .from(core.doctors)
    .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
    .leftJoin(core.specialties, eq(core.specialties.id, core.doctors.specialtyId))
    .where(and(eq(core.doctors.accepting, true), eq(core.clinics.visible, true), eq(core.clinics.status, "approved")))
    .orderBy(desc(core.doctors.createdAt))
    .limit(limit);
  return rows;
}

async function getVisibleClinicCount(): Promise<number> {
  const [row] = await coreDb
    .select({ c: count() })
    .from(core.clinics)
    .where(and(eq(core.clinics.visible, true), eq(core.clinics.status, "approved")));
  return Number(row?.c ?? 0);
}

async function getAverageAdultPrice(): Promise<number | null> {
  const rows = await coreDb
    .select({ priceAdultCents: core.doctors.priceAdultCents })
    .from(core.doctors)
    .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
    .where(and(eq(core.doctors.accepting, true), eq(core.clinics.visible, true), isNotNull(core.doctors.priceAdultCents)));
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + (r.priceAdultCents ?? 0), 0);
  return Math.round(total / rows.length);
}

// ------- presentation pieces ------------------------------------------------

const TONES = ["warm", "deep", "neutral"] as const;

function HeroCard({ featured }: { featured: Awaited<ReturnType<typeof getFeaturedDoctors>>[number] | null }) {
  const priceDollars = featured?.priceAdultCents != null ? (featured.priceAdultCents / 100).toFixed(0) : null;
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--rule)",
          borderRadius: 18,
          padding: 22,
          boxShadow: "var(--shadow-lg)",
          transform: "rotate(-1.2deg)",
        }}
      >
        <DoctorPhoto label={featured ? `${featured.displayName} \u00B7 clinic` : "Sample clinic"} tone="warm" ratio="5/4" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 18 }}>
          <div>
            <div className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 4 }}>
              {featured
                ? `${(featured.specialty ?? "").toUpperCase()} \u00B7 ${featured.city.toUpperCase()}, ${featured.region}`
                : "FAMILY MEDICINE · COLORADO"}
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: 24, letterSpacing: "-0.015em" }}>
              {featured?.displayName ?? "Your next doctor"}
            </div>
          </div>
          <span className="chip chip-dot">Accepting</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid var(--rule)",
          }}
        >
          <Tile
            label="Membership"
            value={priceDollars ? `$${priceDollars}` : "\u2014"}
            suffix={priceDollars ? "/mo" : undefined}
            tone="primary"
          />
          <Tile label="Panel" value="~400" />
          <Tile label="Next visit" value="This week" tone="good" />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -24,
          left: -34,
          background: "var(--primary)",
          color: "var(--primary-ink)",
          padding: "12px 18px",
          borderRadius: 999,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          boxShadow: "var(--shadow-md)",
        }}
      >
        &#9733; Same-week appointments
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "primary" | "good";
}) {
  const color = tone === "primary" ? "var(--primary)" : tone === "good" ? "var(--good)" : "var(--ink)";
  return (
    <div>
      <div className="t-mono" style={{ color: "var(--ink-4)" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: "var(--display)", fontSize: 22, color }}>
        {value}
        {suffix && <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function DoctorPhoto({
  label,
  tone,
  ratio = "5/3",
}: {
  label: string;
  tone: "warm" | "deep" | "neutral";
  ratio?: string;
}) {
  const bg =
    tone === "warm"
      ? "linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%)"
      : tone === "deep"
        ? "linear-gradient(135deg, var(--primary) 0%, var(--forest) 100%)"
        : "linear-gradient(135deg, var(--bg-deep) 0%, var(--rule-2) 100%)";
  return (
    <div
      style={{
        aspectRatio: ratio,
        background: bg,
        position: "relative",
        overflow: "hidden",
        borderRadius: 10,
        border: "1px solid var(--rule)",
      }}
      aria-label={label}
      role="img"
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 14px)",
        }}
      />
    </div>
  );
}

function TickerStrip({ items }: { items: string[] }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        padding: "14px 0",
        overflow: "hidden",
      }}
    >
      <div
        className="wrap"
        style={{
          display: "flex",
          gap: 48,
          fontFamily: "var(--mono)",
          fontSize: 12,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: ".14em",
          whiteSpace: "nowrap",
          overflowX: "auto",
        }}
      >
        {items.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ color: "var(--accent)" }}>&#10022;</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}
