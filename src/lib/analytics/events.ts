/**
 * Typed analytics event helpers. All events funnel through `track()`
 * which calls window.plausible if it's loaded (production) or no-ops
 * if it isn't (local dev, tests).
 *
 * Event naming convention: `<surface>_<action>` in snake_case. Keep the
 * set small and semantically meaningful — Plausible groups these as
 * Goals on the dashboard. Don't emit the same event at multiple
 * codepaths with different semantics; split the event name instead.
 */

type EventProps = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: EventProps }) => void;
  }
}

export type EventName =
  // Patient onboarding funnel
  | "onboarding_start"
  | "onboarding_step_2_submit"
  | "onboarding_step_3_submit"
  | "onboarding_step_4_submit"
  | "onboarding_match_selected"
  | "onboarding_subscription_created"
  | "onboarding_waitlist_entered"
  // Standalone waitlist
  | "waitlist_direct_submitted"
  // Marketing surface
  | "search_submitted"
  | "doctor_profile_viewed"
  | "doctor_subscribe_clicked";

export function track(name: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const p = window.plausible;
  if (typeof p !== "function") return;
  try {
    p(name, props && Object.keys(props).length > 0 ? { props } : undefined);
  } catch {
    // Plausible failures never break the UI.
  }
}
