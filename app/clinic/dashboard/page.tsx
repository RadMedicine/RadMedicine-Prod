import Link from "next/link";
import { redirect } from "next/navigation";
import { getEditableClinicsForCurrentUser } from "@/src/lib/clinic-auth";

/**
 * Landing at /clinic/dashboard.
 *
 *  - 0 clinics: "You're not linked to a clinic yet" (operator signed in
 *    but no clinic_users row; an admin has to link them)
 *  - 1 clinic:  auto-redirect into /clinic/dashboard/[slug]
 *  - 2+ clinics: picker
 */
export default async function ClinicDashboardIndexPage() {
  const { clinics } = await getEditableClinicsForCurrentUser();

  if (clinics.length === 0) {
    return (
      <main className="wrap-narrow" style={{ padding: "var(--s-8) 0 var(--s-10)", maxWidth: 560 }}>
        <h1 className="t-h2" style={{ marginTop: 0 }}>
          No clinic assigned.
        </h1>
        <p className="t-body" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
          You&apos;re signed in, but your email isn&apos;t linked to a clinic yet. An admin needs to add you
          to <code>core.clinic_users</code> before you can edit a clinic profile.
        </p>
        <p className="t-small" style={{ marginTop: "var(--s-4)", color: "var(--ink-3)" }}>
          Email <a href="mailto:support@radmedicine.io">support@radmedicine.io</a> if this is unexpected.
        </p>
      </main>
    );
  }

  if (clinics.length === 1) {
    redirect(`/clinic/dashboard/${clinics[0].slug}`);
  }

  return (
    <main className="wrap" style={{ padding: "var(--s-6) 0 var(--s-9)" }}>
      <p className="t-eyebrow">Clinic dashboard</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-4)" }}>
        Which clinic?
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginBottom: "var(--s-5)" }}>
        You can edit {clinics.length} clinics. Pick one to get started.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {clinics.map((c) => (
          <Link
            key={c.slug}
            href={`/clinic/dashboard/${c.slug}`}
            className="card"
            style={{ display: "block", textDecoration: "none" }}
          >
            <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 8 }}>
              {c.city.toUpperCase()}, {c.region}
            </p>
            <div style={{ fontFamily: "var(--display)", fontSize: 20, letterSpacing: "-0.015em", marginBottom: 8 }}>
              {c.name}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="chip">{c.status}</span>
              <span className="chip">{c.visible ? "visible" : "hidden"}</span>
              <span className="chip">{c.role}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
