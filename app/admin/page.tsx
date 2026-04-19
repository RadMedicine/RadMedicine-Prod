import {
  dollars,
  getAdminActivations,
  getAdminClinics,
  getAdminKpis,
  getAdminSubscriptionsWithEmail,
} from "@/src/lib/admin/data";
import { AdminActions } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Admin overview — read-only tables + single-click action buttons, per
 * PROJECT_PLAN Workstream F.
 *
 * Auth: gated by middleware.ts (JWT session + ADMIN_EMAILS allowlist).
 * Mutating server actions re-check the session server-side (defense in
 * depth — an unverified direct POST won't punch through).
 *
 * Reads /admin is the deliberate cross-schema read point per ADR 001.
 * Every resolution of subscriber_token → email writes a row to
 * contact.subscriber_access_log tagged with the signed-in admin's
 * email. See src/lib/admin/data.ts.
 *
 * Actions wired: approveClinic, toggleClinicVisibility.
 * Stubbed (Stripe-gated): resendWelcomeEmail, issueRefund, cancelSubscription.
 */

export default async function AdminOverviewPage() {
  const [kpis, clinics, subscriptions, activations] = await Promise.all([
    getAdminKpis(),
    getAdminClinics(),
    getAdminSubscriptionsWithEmail(),
    getAdminActivations(),
  ]);

  const totalPanel = clinics.reduce((n, c) => n + c.panelCurrent, 0);

  return (
    <main className="wrap" style={{ padding: "var(--s-6) 0 var(--s-9)" }}>
      <h1 className="t-h2" style={{ marginTop: 0, marginBottom: 0 }}>
        Overview
      </h1>

      <section
        style={{
          marginTop: "var(--s-5)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--s-3)",
        }}
      >
        {[
          { k: "Clinics live", v: kpis.clinicsLive },
          { k: "Awaiting approval", v: kpis.clinicsPending },
          { k: "Active subscriptions", v: kpis.subsActive },
          { k: "MRR", v: dollars(kpis.mrrCents) },
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
            {clinics.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Clinic", "Location", "Status", "Visibility", "Panel", "Actions"]}
            rows={clinics.map((c) => [
              <strong key={`${c.id}-name`}>{c.name}</strong>,
              `${c.city}, ${c.region}`,
              <StatusPill key={`${c.id}-status`} status={c.status} />,
              c.visible ? "Visible" : "Hidden",
              `${c.panelCurrent}${c.panelCap ? ` / ${c.panelCap}` : ""}`,
              <AdminActions
                key={`${c.id}-actions`}
                actions={[
                  c.status === "pending" && { label: "Approve", kind: "approveClinic", id: c.id, tone: "primary" },
                  {
                    label: c.visible ? "Hide" : "Show",
                    kind: "toggleClinicVisibility",
                    id: c.id,
                    tone: "ghost",
                    nextVisible: !c.visible,
                  },
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
            {subscriptions.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Subscriber", "Doctor", "Plan", "Status", "Price", "Started", "Actions"]}
            rows={subscriptions.map((s) => [
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
            {activations.length} total
          </span>
        </div>
        <div className="card" style={{ marginTop: "var(--s-3)", padding: 0, overflow: "hidden" }}>
          <AdminTable
            columns={["Subscriber", "Doctor", "Fee", "Settled", "Created"]}
            rows={activations.map((a) => [
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
