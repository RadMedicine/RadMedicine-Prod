import {
  SEED_ACTIVATIONS,
  SEED_CLINICS,
  SEED_SUBSCRIPTIONS,
  dollars,
} from "@/src/lib/admin/seed";
import { AdminActions } from "./actions";

/**
 * Admin overview — read-only tables + single-click action buttons, per
 * PROJECT_PLAN Workstream F.
 *
 * Current state: wireframe. Data is seeded from src/lib/admin/seed.ts
 * (the shapes match db/schema.sql). Action buttons route through
 * AdminActions (client component) and currently console.info a stub.
 *
 * What is DONE:
 *   - Route structure + nested layout (no marketing chrome on /admin)
 *   - Tables for clinics, subscriptions, activations
 *   - Action buttons in place with the right surface area per action
 *
 * What is NOT done (flagged in the banner):
 *   - No auth gate. NextAuth + email allowlist lands in Week 2.
 *   - No real DB reads — all rows from seed.ts.
 *   - No real action wiring — buttons log; next pass wires to the
 *     billing / email / contact services (ADR 001).
 *   - No contact.subscriber_access_log entries written. Every admin
 *     read of an email below would write an audit record in prod.
 */

export default function AdminOverviewPage() {
  const totalPanel = SEED_CLINICS.reduce((n, c) => n + c.panelCurrent, 0);
  const pendingClinics = SEED_CLINICS.filter((c) => c.status === "pending").length;
  const activeSubs = SEED_SUBSCRIPTIONS.filter((s) => s.status === "active").length;
  const mrrCents = SEED_SUBSCRIPTIONS.filter((s) => s.status === "active" || s.status === "trialing").reduce(
    (n, s) => n + s.priceCents,
    0,
  );

  return (
    <main className="wrap" style={{ padding: "var(--s-6) 0 var(--s-9)" }}>
      {/* Unauthenticated-yet banner */}
      <div
        role="alert"
        style={{
          padding: "var(--s-4)",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--r-2)",
          color: "var(--accent-2)",
          fontSize: 13,
          display: "flex",
          gap: "var(--s-3)",
          alignItems: "flex-start",
        }}
      >
        <strong style={{ flexShrink: 0 }}>Wireframe.</strong>
        <span>
          This route is <em>not yet authenticated</em>. NextAuth email allowlist lands in Week 2 (PROJECT_PLAN
          Workstream F). Don&apos;t link to <code>/admin</code> from anywhere public until then.
        </span>
      </div>

      <h1 className="t-h2" style={{ marginTop: "var(--s-6)", marginBottom: 0 }}>
        Overview
      </h1>

      {/* KPI strip */}
      <section
        style={{
          marginTop: "var(--s-5)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--s-3)",
        }}
      >
        {[
          { k: "Clinics live", v: SEED_CLINICS.filter((c) => c.status === "approved" && c.visible).length },
          { k: "Awaiting approval", v: pendingClinics },
          { k: "Active subscriptions", v: activeSubs },
          { k: "MRR", v: dollars(mrrCents) },
        ].map(({ k, v }) => (
          <div key={k} className="card" style={{ padding: "var(--s-4)" }}>
            <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 6 }}>
              {k.toUpperCase()}
            </p>
            <div style={{ fontFamily: "var(--display)", fontSize: 28, color: "var(--ink)", lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </section>

      <p className="t-small" style={{ marginTop: "var(--s-4)", color: "var(--ink-3)" }}>
        Total panel across all clinics: {totalPanel.toLocaleString()} patients.
      </p>

      {/* Clinics */}
      <section style={{ marginTop: "var(--s-7)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="t-h3" style={{ margin: 0 }}>
            Clinics
          </h2>
          <span className="t-mono" style={{ color: "var(--ink-4)" }}>
            {SEED_CLINICS.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Clinic", "Location", "Status", "Visibility", "Panel", "Actions"]}
            rows={SEED_CLINICS.map((c) => [
              <strong key={`${c.id}-name`}>{c.name}</strong>,
              `${c.city}, ${c.region}`,
              <StatusPill key={`${c.id}-status`} status={c.status} />,
              c.visible ? "Visible" : "Hidden",
              `${c.panelCurrent}${c.panelCap ? ` / ${c.panelCap}` : ""}`,
              <AdminActions
                key={`${c.id}-actions`}
                actions={[
                  c.status === "pending" && { label: "Approve", kind: "approveClinic", id: c.id, tone: "primary" },
                  { label: c.visible ? "Hide" : "Show", kind: "toggleClinicVisibility", id: c.id, tone: "ghost" },
                ]}
              />,
            ])}
          />
        </div>
      </section>

      {/* Subscriptions */}
      <section style={{ marginTop: "var(--s-7)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="t-h3" style={{ margin: 0 }}>
            Subscriptions
          </h2>
          <span className="t-mono" style={{ color: "var(--ink-4)" }}>
            {SEED_SUBSCRIPTIONS.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Subscriber", "Doctor", "Plan", "Status", "Price", "Started", "Actions"]}
            rows={SEED_SUBSCRIPTIONS.map((s) => [
              <span key={`${s.id}-email`} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                {s.subscriberEmail}
              </span>,
              s.doctorName,
              s.plan,
              <StatusPill key={`${s.id}-status`} status={s.status} />,
              `${dollars(s.priceCents)} / mo`,
              new Date(s.startedAt).toISOString().slice(0, 10),
              <AdminActions
                key={`${s.id}-actions`}
                actions={[
                  { label: "Resend welcome", kind: "resendWelcomeEmail", id: s.id, tone: "ghost" },
                  { label: "Refund", kind: "issueRefund", id: s.id, tone: "ghost" },
                  { label: "Cancel", kind: "cancelSubscription", id: s.id, tone: "ghost" },
                ]}
              />,
            ])}
          />
        </div>
      </section>

      {/* Recent activations */}
      <section style={{ marginTop: "var(--s-7)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 className="t-h3" style={{ margin: 0 }}>
            Recent activations
          </h2>
          <span className="t-mono" style={{ color: "var(--ink-4)" }}>
            {SEED_ACTIVATIONS.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Subscriber", "Doctor", "Fee", "Settled", "Created"]}
            rows={SEED_ACTIVATIONS.map((a) => [
              <span key={`act-${a.id}-email`} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                {a.subscriberEmail}
              </span>,
              a.doctorName,
              dollars(a.feeCents),
              a.settledAt ? new Date(a.settledAt).toISOString().slice(0, 10) : <span style={{ color: "var(--ink-4)" }}>—</span>,
              new Date(a.createdAt).toISOString().slice(0, 10),
            ])}
          />
        </div>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "approved" || status === "active"
      ? "good"
      : status === "pending" || status === "trialing"
        ? "neutral"
        : status === "past_due" || status === "paused"
          ? "warn"
          : "bad";
  const bg =
    tone === "good"
      ? "color-mix(in oklab, var(--good) 18%, transparent)"
      : tone === "warn"
        ? "var(--accent-soft)"
        : tone === "bad"
          ? "color-mix(in oklab, var(--danger) 18%, transparent)"
          : "var(--bg-deep)";
  const color =
    tone === "good" ? "var(--primary-2)" : tone === "warn" ? "var(--accent-2)" : tone === "bad" ? "var(--danger)" : "var(--ink-2)";
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 11,
        fontFamily: "var(--mono)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function AdminTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "var(--bg-deep)" }}>
          {columns.map((c) => (
            <th
              key={c}
              className="t-mono"
              scope="col"
              style={{
                textAlign: "left",
                padding: "10px 14px",
                color: "var(--ink-3)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "12px 14px", verticalAlign: "middle", color: "var(--ink)" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
