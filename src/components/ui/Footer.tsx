import Link from "next/link";
import { Logo } from "./Logo";

/**
 * 5-column footer — brand block + Patients / Clinics / Company / Legal.
 * Placeholder hrefs use "#" until the target pages exist. Some targets
 * (Help center, Careers, Press, Contact) are deferred past Beta; the
 * links render but stay inert for now.
 */

type Section = { title: string; links: { href: string; label: string }[] };

const SECTIONS: Section[] = [
  {
    title: "Patients",
    links: [
      { href: "/", label: "How it works" },
      { href: "/search", label: "Find a doctor" },
      { href: "/waitlist", label: "Join the waitlist" },
      { href: "#", label: "What is DPC?" },
    ],
  },
  {
    title: "Clinics",
    links: [
      { href: "/for-clinics", label: "Join the platform" },
      { href: "/clinic/onboarding", label: "Onboarding" },
      { href: "#", label: "Partner login" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Careers" },
      { href: "#", label: "Press" },
      { href: "#", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy" },
      { href: "#", label: "Terms" },
      { href: "#", label: "Accessibility" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer" data-testid="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Logo variant="mark" size={24} />
            <p className="t-small" style={{ marginTop: 14, maxWidth: 280 }}>
              The first patient acquisition platform built exclusively for Direct Primary Care.
            </p>
            <p className="t-mono" style={{ marginTop: 20, color: "var(--ink-4)" }}>
              &copy; 2026 RAD MEDICINE, INC.
            </p>
          </div>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h4>{section.title}</h4>
              <ul>
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
