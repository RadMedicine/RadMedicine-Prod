import { getClinicBySlug, getPrimaryDoctor } from "@/src/lib/clinic-data";
import { notFound } from "next/navigation";

type Params = Promise<{ clinicSlug: string }>;

export default async function OverviewPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  const clinic = await getClinicBySlug(clinicSlug);
  if (!clinic) notFound();
  const doctor = await getPrimaryDoctor(clinic.id);

  return (
    <div>
      <p className="t-eyebrow">Overview</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-5)" }}>
        {clinic.name}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--s-3)",
          marginBottom: "var(--s-5)",
        }}
      >
        {[
          ["Status", clinic.status],
          ["Visibility", clinic.visible ? "visible" : "hidden"],
          ["Year opened", clinic.yearOpened ?? "\u2014"],
        ].map(([k, v]) => (
          <div key={String(k)} className="card" style={{ padding: "var(--s-4)" }}>
            <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 6 }}>
              {String(k).toUpperCase()}
            </p>
            <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", lineHeight: 1 }}>
              {String(v)}
            </div>
          </div>
        ))}
      </div>

      {doctor ? (
        <>
          <h2 className="t-h3" style={{ marginTop: "var(--s-6)", marginBottom: "var(--s-3)" }}>
            Primary doctor
          </h2>
          <div className="card" style={{ padding: "var(--s-4)" }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 20 }}>{doctor.displayName}</div>
            {doctor.credentials && (
              <p className="t-small" style={{ color: "var(--ink-3)", marginTop: 4 }}>
                {doctor.credentials}
              </p>
            )}
            <div style={{ display: "flex", gap: "var(--s-4)", marginTop: "var(--s-3)", flexWrap: "wrap", fontSize: 13 }}>
              <span>
                Panel: <strong>{doctor.panelCurrent}</strong> / {doctor.panelCap ?? "\u2014"}
              </span>
              <span>Accepting: <strong>{doctor.accepting ? "yes" : "no"}</strong></span>
              <span>Languages: {doctor.languages?.join(", ") || "\u2014"}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="t-body" style={{ color: "var(--ink-3)", marginTop: "var(--s-4)" }}>
          No doctor set up yet. Add one from the Profile tab.
        </p>
      )}
    </div>
  );
}
