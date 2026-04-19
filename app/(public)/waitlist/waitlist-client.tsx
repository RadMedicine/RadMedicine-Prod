"use client";

import { useState, useTransition } from "react";
import { submitWaitlistAction } from "./actions";

export function WaitlistClient({ initialZip, initialEmail }: { initialZip: string; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [zip, setZip] = useState(initialZip);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await submitWaitlistAction({ email, zip, source: "waitlist_direct" });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (done) {
    return (
      <main className="wrap-narrow" style={{ padding: "var(--s-8) 0 var(--s-10)", maxWidth: 520 }}>
        <p className="t-eyebrow">Waitlist</p>
        <h1 className="t-h2" style={{ marginTop: 10 }}>
          You&apos;re on the <em>waitlist</em>.
        </h1>
        <p className="t-body-lg" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
          We&apos;ll email you the moment RadMedicine opens in your state. Check your inbox for a
          confirmation in the meantime.
        </p>
        <p className="t-small" style={{ marginTop: "var(--s-5)", color: "var(--ink-3)" }}>
          <a href="/" style={{ color: "var(--primary)" }}>
            Back home
          </a>
        </p>
      </main>
    );
  }

  return (
    <main className="wrap-narrow" style={{ padding: "var(--s-8) 0 var(--s-10)", maxWidth: 520 }}>
      <p className="t-eyebrow">Waitlist</p>
      <h1 className="t-h2" style={{ marginTop: 10 }}>
        We&apos;re in <em>Colorado</em> first.
      </h1>
      <p className="t-body-lg" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
        RadMedicine is Colorado-only during Beta. We&apos;re opening new states carefully &mdash; health-data
        laws vary and we want to get it right. Leave your email and we&apos;ll tell you the moment we&apos;re
        open to you.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: "var(--s-4)",
            padding: "var(--s-3) var(--s-4)",
            background: "color-mix(in oklab, var(--danger) 10%, transparent)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--r-2)",
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        <div>
          <label htmlFor="waitlist_email" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>
            Email
          </label>
          <input
            id="waitlist_email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="waitlist_zip" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>
            ZIP (optional)
          </label>
          <input
            id="waitlist_zip"
            name="zip"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="10001"
            style={inputStyle}
          />
          <p className="t-small" style={{ color: "var(--ink-3)", marginTop: 6 }}>
            Helps us prioritize the states with the most interest.
          </p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: "var(--s-2)" }}>
          {pending ? "Joining\u2026" : "Join the waitlist"}
        </button>
      </form>

      <p className="t-small" style={{ marginTop: "var(--s-5)", color: "var(--ink-3)" }}>
        In Colorado already?{" "}
        <a href="/onboarding" style={{ color: "var(--primary)" }}>
          Find a doctor now &rarr;
        </a>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "var(--r-2)",
  border: "1px solid var(--rule-2)",
  fontFamily: "var(--sans)",
  fontSize: 14,
  background: "var(--bg-elev)",
  color: "var(--ink)",
};
