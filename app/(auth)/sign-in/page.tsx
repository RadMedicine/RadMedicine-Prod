import { signIn } from "@/src/lib/auth";

type SearchParams = Promise<{ from?: string; denied?: string; error?: string }>;

/**
 * Magic-link sign-in. Email submits as a server action that calls
 * `signIn("email", ...)` which generates a verification token, writes
 * it to the DB, and dispatches via the Postmark stub.
 *
 * Used by /admin (email must be in ADMIN_EMAILS) and /clinic/dashboard
 * (user must have a row in core.clinic_users). This page doesn't know
 * about those checks — the landing-page routes do.
 */
export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { from, denied, error } = await searchParams;
  const callbackUrl = from && from.startsWith("/") ? from : "/admin";

  async function submit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("email", { email, redirectTo: callbackUrl });
  }

  return (
    <main className="wrap-narrow" style={{ padding: "var(--s-8) 0 var(--s-10)", maxWidth: 480 }}>
      <p className="t-eyebrow">Sign in</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-4)" }}>
        Sign in to <em>RadMedicine</em>
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginBottom: "var(--s-5)" }}>
        Enter your email and we&apos;ll send you a link. No password to remember.
      </p>

      {denied === "admin" && (
        <div
          role="alert"
          style={{
            padding: "var(--s-3) var(--s-4)",
            background: "color-mix(in oklab, var(--danger) 10%, transparent)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--r-2)",
            color: "var(--danger)",
            fontSize: 13,
            marginBottom: "var(--s-4)",
          }}
        >
          That email isn&apos;t on the admin allowlist. Sign in with an authorized address.
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: "var(--s-3) var(--s-4)",
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--r-2)",
            color: "var(--accent-2)",
            fontSize: 13,
            marginBottom: "var(--s-4)",
          }}
        >
          Sign-in failed. Try again, or check your email for the previous link.
        </div>
      )}

      <form action={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500 }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@clinic.com"
          autoComplete="email"
          style={{
            padding: "10px 14px",
            borderRadius: "var(--r-2)",
            border: "1px solid var(--rule-2)",
            fontFamily: "var(--sans)",
            fontSize: 14,
            background: "var(--bg-elev)",
            color: "var(--ink)",
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--s-2)" }}>
          Send sign-in link
        </button>
      </form>

      <p className="t-small" style={{ marginTop: "var(--s-5)", color: "var(--ink-3)" }}>
        Trouble signing in? Email <a href="mailto:support@radmedicine.io">support@radmedicine.io</a>.
      </p>
    </main>
  );
}
