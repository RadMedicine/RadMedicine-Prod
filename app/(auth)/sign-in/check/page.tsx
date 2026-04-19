export default function CheckInboxPage() {
  return (
    <main className="wrap-narrow" style={{ padding: "var(--s-8) 0 var(--s-10)", maxWidth: 480 }}>
      <p className="t-eyebrow">Sign in</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-4)" }}>
        Check your <em>inbox</em>.
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginBottom: "var(--s-4)" }}>
        We sent a sign-in link to the email you entered. Click it within 10 minutes to finish.
      </p>
      <p className="t-small" style={{ color: "var(--ink-3)" }}>
        No link yet? Check spam. Still nothing, try signing in again.
      </p>
    </main>
  );
}
