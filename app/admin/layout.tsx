import Link from "next/link";
import { Logo } from "@/src/components/ui/Logo";

/**
 * Admin chrome — minimal header, no marketing Topbar/Footer. This
 * layout nests inside the root layout (which provides <html>, <body>,
 * fonts). The public Topbar/Footer live in app/(public)/layout.tsx so
 * /admin opts out automatically.
 *
 * Allowlist gate: NOT YET WIRED. PROJECT_PLAN Workstream F calls for an
 * email-allowlist gate via NextAuth. Until NextAuth lands (Week 2), the
 * banner at the top of page.tsx is the only thing telling the operator
 * "this isn't actually protected."
 */
export const metadata = {
  title: "Admin · RadMedicine",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
            ADMIN
          </span>
          <div style={{ flex: 1 }} />
          <nav style={{ display: "flex", gap: "var(--s-4)", fontSize: 14 }}>
            <Link href="/admin" style={{ color: "var(--ink-2)" }}>
              Overview
            </Link>
            <Link href="/" style={{ color: "var(--ink-3)" }}>
              Exit &rarr;
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
