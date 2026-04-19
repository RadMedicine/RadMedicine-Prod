"use client";

/**
 * Admin action buttons — inert console stubs for Beta wireframe.
 *
 * Each action maps to a concrete service call that will exist in a
 * later pass (PROJECT_PLAN Workstream F):
 *
 *   approveClinic              -> core.clinics.status='approved'
 *   toggleClinicVisibility     -> core.clinics.visible flip
 *   resendWelcomeEmail         -> email service (audited contact read)
 *   issueRefund                -> billing service (Stripe refund)
 *   cancelSubscription         -> billing service (Stripe cancel) +
 *                                 core.subscriptions.status='canceled'
 *
 * Falsy entries in `actions` are filtered so callers can inline
 * conditionals (e.g. only show Approve on pending rows).
 */

export type ActionKind =
  | "approveClinic"
  | "toggleClinicVisibility"
  | "resendWelcomeEmail"
  | "issueRefund"
  | "cancelSubscription";

export type ActionDef = {
  label: string;
  kind: ActionKind;
  id: string;
  tone?: "primary" | "ghost";
};

export function AdminActions({ actions }: { actions: Array<ActionDef | false | null | undefined> }) {
  const real = actions.filter(Boolean) as ActionDef[];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {real.map((a) => (
        <button
          key={`${a.kind}-${a.id}-${a.label}`}
          type="button"
          className={`btn btn-sm ${a.tone === "primary" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            // Confirm destructive actions even in the stub — keeps muscle
            // memory correct once the real wiring lands.
            const destructive = a.kind === "cancelSubscription" || a.kind === "issueRefund";
            if (destructive && !window.confirm(`${a.label}?`)) return;
            // eslint-disable-next-line no-console
            console.info(`[admin] ${a.kind} ${a.id} — stub (wire to service in a later pass)`);
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
