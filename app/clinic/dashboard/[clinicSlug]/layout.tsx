import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClinicAccess } from "@/src/lib/clinic-auth";

type Params = Promise<{ clinicSlug: string }>;

/**
 * Per-clinic layout — sidebar nav with Profile / Pricing / Availability
 * links. Enforces clinic ownership via requireClinicAccess; if the
 * signed-in user doesn't own this slug, render 404 (so we don't leak
 * existence of clinics the user can't edit).
 */
export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { clinicSlug } = await params;
  let clinic: Awaited<ReturnType<typeof requireClinicAccess>>["clinic"];
  try {
    const ctx = await requireClinicAccess(clinicSlug);
    clinic = ctx.clinic;
  } catch {
    notFound();
  }

  const nav: Array<{ href: string; label: string }> = [
    { href: `/clinic/dashboard/${clinicSlug}`, label: "Overview" },
    { href: `/clinic/dashboard/${clinicSlug}/profile`, label: "Profile" },
    { href: `/clinic/dashboard/${clinicSlug}/pricing`, label: "Pricing" },
    { href: `/clinic/dashboard/${clinicSlug}/availability`, label: "Availability" },
  ];

  return (
    <div
      className="wrap"
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        gap: "var(--s-7)",
        padding: "var(--s-6) 0 var(--s-9)",
        alignItems: "start",
      }}
    >
      <aside>
        <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 6 }}>
          {clinic.city.toUpperCase()}, {clinic.region}
        </p>
        <h2 style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: "-0.015em", marginTop: 0, marginBottom: "var(--s-4)" }}>
          {clinic.name}
        </h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "var(--s-5)" }}>
          <span className="chip">{clinic.status}</span>
          <span className="chip">{clinic.visible ? "visible" : "hidden"}</span>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                style={{
                  display: "block",
                  padding: "10px 14px",
                  borderRadius: "var(--r-2)",
                  color: "var(--ink-2)",
                  fontSize: 14,
                }}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main>{children}</main>
    </div>
  );
}
