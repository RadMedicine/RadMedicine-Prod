import Link from "next/link";
import { Logo } from "@/src/components/ui/Logo";

/**
 * Minimal chrome for sign-in flow. No Topbar/Footer — sign-in is a
 * focused task. Just the logo as a way home.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        style={{
          padding: "var(--s-5) var(--s-6)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <Link href="/" aria-label="RadMedicine home" style={{ display: "inline-flex" }}>
          <Logo variant="mark" size={22} />
        </Link>
      </header>
      {children}
    </>
  );
}
