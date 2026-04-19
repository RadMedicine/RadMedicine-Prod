import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";

type SearchParams = Promise<{ specialty?: string; zip?: string }>;

export const metadata = {
  title: "Find a Colorado DPC clinic \u00B7 RadMedicine",
  description: "Direct primary care clinics in Colorado. Transparent monthly pricing, listed availability, real doctors.",
};

/**
 * Search Results (/search) — simplified per Beta scope cut:
 *   "Search = sorted list + specialty/ZIP filter only. No map, no
 *    distance, no language filter."
 *
 * ZIP is captured in the URL for future geo-distance work but does not
 * filter results yet. Current filter is specialty only; all listed
 * clinics are CO-only by seed. Results are approved + visible clinics
 * with accepting doctors, sorted alphabetically.
 */
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { specialty: specialtySlug, zip } = await searchParams;
  const zipClean = (zip ?? "").trim();

  const [specialties, results] = await Promise.all([getSpecialties(), getResults(specialtySlug)]);
  const activeSpecialty = specialties.find((s) => s.slug === specialtySlug) ?? null;

  return (
    <>
      {/* Sticky search bar */}
      <section
        style={{
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          padding: "var(--s-4) 0",
          position: "sticky",
          top: 56,
          zIndex: 20,
        }}
      >
        <div className="wrap">
          <form action="/search" style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "var(--bg)",
                border: "1px solid var(--rule-2)",
                borderRadius: "var(--r-2)",
                flex: "1 1 280px",
              }}
            >
              <span aria-hidden style={{ color: "var(--ink-3)" }}>&#9679;</span>
              <input
                name="zip"
                defaultValue={zipClean}
                placeholder="Colorado ZIP or city (optional)"
                style={{
                  border: 0,
                  background: "transparent",
                  outline: 0,
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  flex: 1,
                  color: "var(--ink)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                background: "var(--bg)",
                border: "1px solid var(--rule-2)",
                borderRadius: "var(--r-2)",
                flex: "1 1 260px",
              }}
            >
              <select
                name="specialty"
                defaultValue={specialtySlug ?? ""}
                style={{
                  border: 0,
                  background: "transparent",
                  outline: 0,
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  flex: 1,
                  color: "var(--ink)",
                  appearance: "none",
                }}
              >
                <option value="">All specialties</option>
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
        </div>
      </section>

      <section style={{ padding: "var(--s-6) 0 var(--s-9)" }}>
        <div className="wrap">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "var(--s-5)",
              flexWrap: "wrap",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <p className="t-mono" style={{ color: "var(--ink-4)" }}>
                Results
              </p>
              <div style={{ fontFamily: "var(--display)", fontSize: 24, letterSpacing: "-0.015em", marginTop: 4 }}>
                <strong style={{ fontWeight: 400 }}>
                  {results.length} {results.length === 1 ? "clinic" : "clinics"}
                </strong>{" "}
                in Colorado
                {activeSpecialty ? ` \u00B7 ${activeSpecialty.name}` : ""}
                {zipClean ? ` \u00B7 near ${zipClean}` : ""}
              </div>
            </div>
            <p className="t-small" style={{ color: "var(--ink-3)", maxWidth: 280 }}>
              Beta: distance filtering is off. All Colorado clinics matching your specialty show below.
            </p>
          </div>

          {results.length === 0 ? (
            <div className="card" style={{ padding: "var(--s-6)", textAlign: "center", color: "var(--ink-2)" }}>
              <p className="t-body-lg" style={{ margin: 0 }}>
                No clinics match that filter yet.
              </p>
              <p className="t-small" style={{ marginTop: "var(--s-2)", color: "var(--ink-3)" }}>
                Try a different specialty, or clear filters.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r) => (
                <ResultRow key={r.doctorSlug} result={r} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

async function getSpecialties() {
  return coreDb
    .select({ slug: core.specialties.slug, name: core.specialties.name })
    .from(core.specialties)
    .orderBy(core.specialties.displayOrder);
}

async function getResults(specialtySlug?: string) {
  const conditions = [eq(core.clinics.visible, true), eq(core.clinics.status, "approved"), eq(core.doctors.accepting, true)];
  if (specialtySlug) {
    conditions.push(eq(core.specialties.slug, specialtySlug));
  }
  const rows = await coreDb
    .select({
      doctorSlug: core.doctors.slug,
      displayName: core.doctors.displayName,
      credentials: core.doctors.credentials,
      philosophy: core.doctors.philosophy,
      languages: core.doctors.languages,
      panelCurrent: core.doctors.panelCurrent,
      panelCap: core.doctors.panelCap,
      priceAdultCents: core.doctors.priceAdultCents,
      specialty: core.specialties.name,
      clinicName: core.clinics.name,
      city: core.clinics.city,
      region: core.clinics.region,
      tagline: core.clinics.tagline,
    })
    .from(core.doctors)
    .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
    .leftJoin(core.specialties, eq(core.specialties.id, core.doctors.specialtyId))
    .where(and(...conditions))
    .orderBy(asc(core.clinics.name));
  return rows;
}

function ResultRow({ result }: { result: Awaited<ReturnType<typeof getResults>>[number] }) {
  const priceDollars = result.priceAdultCents != null ? (result.priceAdultCents / 100).toFixed(0) : null;
  return (
    <Link
      href={`/doctors/${result.doctorSlug}`}
      className="card"
      style={{
        padding: 20,
        display: "grid",
        gridTemplateColumns: "100px 1fr auto",
        gap: 20,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 100,
          height: 100,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%)",
        }}
      />
      <div>
        <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 3 }}>
          {(result.specialty ?? "").toUpperCase()} &middot; {result.city.toUpperCase()}, {result.region}
        </p>
        <div style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: "-0.015em" }}>
          {result.displayName}
          {result.credentials && <span style={{ color: "var(--ink-3)", fontSize: 14, marginLeft: 8 }}>{result.credentials}</span>}
        </div>
        {result.tagline && (
          <p className="t-small" style={{ color: "var(--ink-2)", marginTop: 4, fontStyle: "italic" }}>
            &ldquo;{result.tagline}&rdquo;
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 8, color: "var(--ink-3)", fontSize: 13, flexWrap: "wrap" }}>
          <span>{result.clinicName}</span>
          {result.languages && result.languages.length > 0 && <span>&middot; {result.languages.join(", ")}</span>}
          <span>
            &middot; Panel {result.panelCurrent}
            {result.panelCap ? `/${result.panelCap}` : ""}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 24, color: "var(--primary)" }}>
          {priceDollars ? (
            <>
              ${priceDollars}
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>/mo</span>
            </>
          ) : (
            <span style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>See profile</span>
          )}
        </div>
        <span className="chip chip-dot">Accepting</span>
        <span className="btn btn-ghost btn-sm" style={{ marginTop: 6, pointerEvents: "none" }}>
          View profile &rarr;
        </span>
      </div>
    </Link>
  );
}
