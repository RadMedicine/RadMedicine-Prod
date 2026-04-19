import Link from "next/link";
import { auth, signOut } from "@/src/lib/auth";
import { Logo } from "@/src/components/ui/Logo";

/**
 * Clinic dashboard chrome — minimal header, no marketing Topbar/Footer.
 * Route is gated by middleware.ts (must be signed in). Per-clinic
 * ownership is enforced inside /clinic/dashboard/[slug]/* via
 * requireClinicAccess.
 */
export const metadata = {
  title: "Clinic dashboard \u00B7 RadMedicine",
  robots: { index: false, follow: false },
};

export default async function ClinicDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email ?? "unknown";

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid var(--rule)",
          background: "var(--bg-elev)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          className="wrap"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-5)",
            padding: "14px var(--s-6)",
          }}
        >
          <Link href="/" aria-label="RadMedicine home" style={{ display: "inline-flex" }}>
            <Logo variant="mark" size={22} />
          </Link>
          <span
            className="t-mono"
            style={{
              padding: "2px 8px",
              border: "1px solid var(--rule-2)",
              borderRadius: "var(--r-1)",
              color: "var(--ink-2)",
              fontSize: 10,
            }}
          >
            CLINIC
          </span>
          <div style={{ flex: 1 }} />
          <nav style={{ display: "flex", gap: "var(--s-4)", fontSize: 14, alignItems: "center" }}>
            <Link href="/clinic/dashboard" style={{ color: "var(--ink-2)" }}>
              Clinics
            </Link>
            <span className="t-mono" style={{ color: "var(--ink-4)", fontSize: 11 }}>
              {email}
            </span>
            <form action={doSignOut}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
