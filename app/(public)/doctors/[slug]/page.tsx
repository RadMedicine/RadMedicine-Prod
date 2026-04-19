import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";

type Params = Promise<{ slug: string }>;

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await getDoctorBundle(slug);
  if (!doctor) return { title: "Doctor not found" };
  const description =
    doctor.doctor.philosophy ||
    doctor.clinic.tagline ||
    `Direct primary care with ${doctor.doctor.displayName} in ${doctor.clinic.city}, ${doctor.clinic.region}. Transparent pricing, long visits, direct access.`;
  return {
    title: `${doctor.doctor.displayName} \u00B7 ${doctor.specialty?.name ?? "DPC"} in ${doctor.clinic.city}, ${doctor.clinic.region}`,
    description,
    alternates: { canonical: `/doctors/${slug}` },
  };
}

export default async function DoctorProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const bundle = await getDoctorBundle(slug);
  if (!bundle) notFound();

  const { doctor, clinic, specialty, availability, reviews } = bundle;
  const priceDollars = doctor.priceAdultCents != null ? (doctor.priceAdultCents / 100).toFixed(0) : null;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const byDow = new Map<number, { start: number; end: number }>();
  for (const a of availability) {
    if (!byDow.has(a.dayOfWeek)) byDow.set(a.dayOfWeek, { start: a.startMin, end: a.endMin });
  }

  return (
    <>
      <section style={{ padding: "var(--s-5) 0", borderBottom: "1px solid var(--rule)" }}>
        <div className="wrap">
          <nav className="t-small" style={{ color: "var(--ink-3)" }} aria-label="Breadcrumb">
            <Link href="/search" style={{ color: "inherit" }}>
              Search
            </Link>
            {specialty && (
              <>
                {" \u00B7 "}
                <Link href={`/search?specialty=${specialty.slug}`} style={{ color: "inherit" }}>
                  {specialty.name}
                </Link>
              </>
            )}
            {" \u00B7 "}
            <strong style={{ color: "var(--ink)" }}>{doctor.displayName}</strong>
          </nav>
        </div>
      </section>

      <section style={{ padding: "var(--s-7) 0" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--s-7)", alignItems: "start" }}>
          <main>
            <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 6 }}>
              {(specialty?.name ?? "").toUpperCase()} &middot; {clinic.city.toUpperCase()}, {clinic.region}
            </p>
            <h1 className="t-h1" style={{ margin: 0 }}>
              {doctor.displayName}
            </h1>
            {doctor.credentials && (
              <p className="t-body" style={{ color: "var(--ink-3)", marginTop: 6 }}>
                {doctor.credentials}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: "var(--s-3)", flexWrap: "wrap" }}>
              <span className="chip chip-dot">Accepting patients</span>
              {avgRating != null && (
                <span className="chip">
                  &#9733; {avgRating.toFixed(1)} ({reviews.length})
                </span>
              )}
              <span className="chip">
                Panel {doctor.panelCurrent}
                {doctor.panelCap ? `/${doctor.panelCap}` : ""}
              </span>
              {doctor.languages && doctor.languages.length > 0 && <span className="chip">{doctor.languages.join(", ")}</span>}
            </div>

            {doctor.philosophy && (
              <p
                className="t-body-lg"
                style={{ marginTop: "var(--s-5)", color: "var(--ink-2)", fontStyle: "italic", maxWidth: 640 }}
              >
                &ldquo;{doctor.philosophy}&rdquo;
              </p>
            )}
            {doctor.bio && (
              <div style={{ marginTop: "var(--s-5)", maxWidth: 640 }}>
                <p className="t-body" style={{ whiteSpace: "pre-line" }}>
                  {doctor.bio}
                </p>
              </div>
            )}

            {/* Clinic info */}
            <section style={{ marginTop: "var(--s-8)" }}>
              <p className="t-eyebrow">Clinic</p>
              <h2 className="t-h3" style={{ marginTop: 10, marginBottom: "var(--s-2)" }}>
                {clinic.name}
              </h2>
              <p className="t-body" style={{ color: "var(--ink-2)" }}>
                {clinic.city}, {clinic.region}
                {clinic.yearOpened && ` \u00B7 Opened ${clinic.yearOpened}`}
              </p>
              {clinic.website && (
                <p className="t-small" style={{ marginTop: 6 }}>
                  <a href={normalizeUrl(clinic.website)} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                    {clinic.website}
                  </a>
                </p>
              )}
            </section>

            {/* Availability */}
            {availability.length > 0 && (
              <section style={{ marginTop: "var(--s-8)" }}>
                <p className="t-eyebrow">Availability</p>
                <h2 className="t-h3" style={{ marginTop: 10, marginBottom: "var(--s-3)" }}>
                  Weekly schedule
                </h2>
                <div className="card" style={{ padding: 0, overflow: "hidden", maxWidth: 520 }}>
                  {DOW_LABELS.map((label, dow) => {
                    const a = byDow.get(dow);
                    return (
                      <div
                        key={dow}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr",
                          padding: "10px 16px",
                          borderBottom: dow < 6 ? "1px solid var(--rule)" : "none",
                          color: a ? "var(--ink)" : "var(--ink-4)",
                        }}
                      >
                        <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                          {label}
                        </span>
                        <span>{a ? `${formatTime(a.start)} \u2013 ${formatTime(a.end)}` : "Closed"}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section style={{ marginTop: "var(--s-8)" }}>
                <p className="t-eyebrow">Reviews</p>
                <h2 className="t-h3" style={{ marginTop: 10, marginBottom: "var(--s-3)" }}>
                  What members say
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", maxWidth: 640 }}>
                  {reviews.map((r) => (
                    <article key={r.id} className="card" style={{ padding: "var(--s-4)" }}>
                      <p className="t-mono" style={{ color: "var(--accent-2)", marginBottom: 6 }}>
                        &#9733; {r.rating}.0
                      </p>
                      {r.body && <p className="t-body" style={{ fontStyle: "italic", color: "var(--ink-2)" }}>&ldquo;{r.body}&rdquo;</p>}
                      <p className="t-small" style={{ color: "var(--ink-3)", marginTop: 6 }}>
                        {r.displayAttribution}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Sticky subscribe CTA */}
          <aside style={{ position: "sticky", top: 100 }}>
            <div className="card" style={{ padding: "var(--s-5)" }}>
              <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 6 }}>
                Membership
              </p>
              {priceDollars ? (
                <div style={{ fontFamily: "var(--display)", fontSize: 44, color: "var(--primary)", lineHeight: 1 }}>
                  ${priceDollars}
                  <span style={{ fontSize: 16, color: "var(--ink-3)", fontFamily: "var(--sans)", marginLeft: 4 }}>/mo</span>
                </div>
              ) : (
                <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)" }}>
                  Contact the clinic
                </div>
              )}
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "var(--s-4) 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 14,
                  color: "var(--ink-2)",
                }}
              >
                <li>&#10004; Unlimited visits with {firstName(doctor.displayName)}</li>
                <li>&#10004; Text, call, or video access</li>
                <li>&#10004; In-office labs &amp; basic procedures included</li>
                <li>&#10004; No copays on included visits</li>
                <li>&#10004; Cancel anytime</li>
              </ul>
              <Link
                href={`/onboarding?doctor=${doctor.slug}`}
                className="btn btn-primary btn-lg"
                style={{ width: "100%", justifyContent: "center", marginTop: "var(--s-5)" }}
              >
                Start membership
              </Link>
              <p className="t-small" style={{ textAlign: "center", color: "var(--ink-3)", marginTop: "var(--s-3)" }}>
                Pairs with your insurance. Most members keep a high-deductible or catastrophic plan alongside DPC.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

async function getDoctorBundle(slug: string) {
  const [row] = await coreDb
    .select({
      doctor: core.doctors,
      clinic: core.clinics,
      specialty: core.specialties,
    })
    .from(core.doctors)
    .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
    .leftJoin(core.specialties, eq(core.specialties.id, core.doctors.specialtyId))
    .where(eq(core.doctors.slug, slug))
    .limit(1);

  if (!row) return null;
  // Only show approved + visible clinics on public profile.
  if (!row.clinic.visible || row.clinic.status !== "approved") return null;

  const [availability, reviews] = await Promise.all([
    coreDb
      .select()
      .from(core.availability)
      .where(eq(core.availability.doctorId, row.doctor.id))
      .orderBy(core.availability.dayOfWeek, core.availability.startMin),
    coreDb
      .select()
      .from(core.reviews)
      .where(eq(core.reviews.doctorId, row.doctor.id))
      .orderBy(desc(core.reviews.createdAt))
      .limit(8),
  ]);

  return { ...row, availability, reviews };
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "p" : "a";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh}${period}` : `${hh}:${String(m).padStart(2, "0")}${period}`;
}

function firstName(displayName: string): string {
  const parts = displayName.replace(/^Dr\.?\s+/i, "").split(" ");
  return parts[0] ?? displayName;
}

function normalizeUrl(raw: string): string {
  if (/^https?:\/\//.test(raw)) return raw;
  return `https://${raw}`;
}
