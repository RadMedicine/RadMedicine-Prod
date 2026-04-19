"use client";

import { useTransition } from "react";
import { approveClinicAction, toggleClinicVisibilityAction } from "./actions-server";

/**
 * Admin action buttons.
 *
 * Live actions (call real server actions):
 *   approveClinic               → approveClinicAction
 *   toggleClinicVisibility      → toggleClinicVisibilityAction
 *
 * Stubbed (console.info only — Stripe-dependent, wires later):
 *   resendWelcomeEmail
 *   issueRefund
 *   cancelSubscription
 *
 * Destructive stubs still fire window.confirm — keeps the operator
 * muscle memory correct for when the real wiring lands.
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
  /** For toggleClinicVisibility: value to set on click. */
  nextVisible?: boolean;
};

export function AdminActions({ actions }: { actions: Array<ActionDef | false | null | undefined> }) {
  const real = actions.filter(Boolean) as ActionDef[];
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {real.map((a) => (
        <button
          key={`${a.kind}-${a.id}-${a.label}`}
          type="button"
          disabled={pending}
          className={`btn btn-sm ${a.tone === "primary" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const destructive = a.kind === "cancelSubscription" || a.kind === "issueRefund";
            if (destructive && !window.confirm(`${a.label}?`)) return;

            startTransition(async () => {
              try {
                if (a.kind === "approveClinic") {
                  await approveClinicAction({ clinicId: a.id });
                  return;
                }
                if (a.kind === "toggleClinicVisibility") {
                  await toggleClinicVisibilityAction({ clinicId: a.id, nextVisible: a.nextVisible ?? true });
                  return;
                }
                // Stubbed kinds — log and return.
                // eslint-disable-next-line no-console
                console.info(`[admin] ${a.kind} ${a.id} — stub (wire to Stripe / email in a later session)`);
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error(`[admin] ${a.kind} failed:`, err);
                window.alert(`${a.label} failed — see console.`);
              }
            });
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
