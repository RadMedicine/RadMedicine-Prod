"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

/**
 * Sticky, backdrop-blurred cream header. Nav set switches based on
 * `mode`: patient surface vs. clinic surface. Active route is detected
 * from the URL so the active link renders darker/bolder.
 *
 * Links are sized to Beta scope — Pricing and About are deferred, so
 * the clinic-side slot that would otherwise hold them is the CTA.
 */

type Mode = "patient" | "clinic";

type NavItem = { href: string; label: string };

const PATIENT_LINKS: NavItem[] = [
  { href: "/", label: "For patients" },
  { href: "/search", label: "Find a doctor" },
  { href: "/for-clinics", label: "For clinics \u2192" },
];

const CLINIC_LINKS: NavItem[] = [
  { href: "/for-clinics", label: "For clinics" },
  { href: "/clinic/onboarding", label: "Join the platform" },
  { href: "/", label: "For patients \u2192" },
];

function inferMode(pathname: string | null): Mode {
  if (!pathname) return "patient";
  if (pathname === "/for-clinics" || pathname.startsWith("/clinic")) return "clinic";
  return "patient";
}

export function Topbar({ mode: modeProp }: { mode?: Mode } = {}) {
  const pathname = usePathname();
  const mode = modeProp ?? inferMode(pathname);
  const links = mode === "clinic" ? CLINIC_LINKS : PATIENT_LINKS;

  const ctaHref = mode === "clinic" ? "/clinic/onboarding" : "/search";
  const ctaLabel = mode === "clinic" ? "Join as a clinic" : "Find a doctor";

  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-inner">
        <Link href="/" aria-label="RadMedicine home">
          <Logo variant="mark" size={26} />
        </Link>
        <div className="topbar-spacer" />
        <nav className="topbar-nav">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href + label}
                href={href}
                style={{
                  color: active ? "var(--ink)" : "var(--ink-3)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/sign-in" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href={ctaHref} className="btn btn-primary btn-sm">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
