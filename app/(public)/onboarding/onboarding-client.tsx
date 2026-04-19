"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import { createSubscriptionAction, submitIntakeAction } from "./actions";
import { submitWaitlistAction } from "../waitlist/actions";
import { track } from "@/src/lib/analytics/events";
import type { IntakeInput, MatchedDoctor, NeedKey } from "@/src/lib/matching/service";

/**
 * Patient onboarding — 7 steps with a CO geofence branch at step 2.
 *
 * State:
 *   - Steps 1-5 answers persist to localStorage under ONBOARDING_LS_KEY.
 *     NO email, NO payment — those only exist in memory during step 6.
 *     Intake data (ZIP, age, needs, insurance) is fine to persist; it's
 *     the same data that lives in med.intake_responses server-side.
 *     See CLAUDE.md critical rule #6.
 *   - Matches come back from the server on step 4 → 5 transition and
 *     live in memory only.
 *
 * Geofence:
 *   - Step 2 checks ZIP against isColoradoZip server-side at submit.
 *   - Client-side helper short-circuits before submit if the ZIP is
 *     obviously non-CO — shows the waitlist branch instead of
 *     attempting the intake submit.
 */

const ONBOARDING_LS_KEY = "radmed.patient-onboarding.v1";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type BranchMode = "continue" | "waitlist";

type State = {
  step: Step;
  branch: BranchMode;
  // Step 2
  zip: string;
  ageBand: IntakeInput["ageBand"] | "";
  householdSize: number;
  // Step 3
  needs: NeedKey[];
  // Step 4
  insurancePosture: IntakeInput["insurancePosture"] | "";
  // Step 5 (returned from server — NOT persisted)
  matches: MatchedDoctor[];
  selectedDoctorSlug: string | null;
  // Step 5 → 6 pass-through (for displaying the chosen doctor in step 6)
  preselectedDoctorSlug: string | null;
};

const initialState: State = {
  step: 1,
  branch: "continue",
  zip: "",
  ageBand: "",
  householdSize: 1,
  needs: [],
  insurancePosture: "",
  matches: [],
  selectedDoctorSlug: null,
  preselectedDoctorSlug: null,
};

type Action =
  | { type: "hydrate"; value: Partial<State> }
  | { type: "goto"; step: Step }
  | { type: "next" }
  | { type: "back" }
  | { type: "set"; patch: Partial<State> }
  | { type: "toggleNeed"; need: NeedKey }
  | { type: "setMatches"; matches: MatchedDoctor[] }
  | { type: "selectDoctor"; slug: string }
  | { type: "setBranch"; branch: BranchMode };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.value };
    case "goto":
      return { ...state, step: action.step };
    case "next":
      return { ...state, step: Math.min(7, state.step + 1) as Step };
    case "back":
      return { ...state, step: Math.max(1, state.step - 1) as Step };
    case "set":
      return { ...state, ...action.patch };
    case "toggleNeed":
      return {
        ...state,
        needs: state.needs.includes(action.need) ? state.needs.filter((n) => n !== action.need) : [...state.needs, action.need],
      };
    case "setMatches":
      return { ...state, matches: action.matches };
    case "selectDoctor":
      return { ...state, selectedDoctorSlug: action.slug };
    case "setBranch":
      return { ...state, branch: action.branch };
  }
}

const NEEDS: Array<{ key: NeedKey; label: string; blurb: string }> = [
  { key: "primary", label: "Primary care", blurb: "Annual, sick visits, prescriptions, referrals" },
  { key: "chronic", label: "Chronic condition", blurb: "Diabetes, hypertension, thyroid, etc." },
  { key: "mental", label: "Mental health support", blurb: "Anxiety, depression, medication management" },
  { key: "pediatrics", label: "Pediatrics", blurb: "Care for kids" },
  { key: "womens", label: "Women's health", blurb: "Hormonal, reproductive, preventive" },
  { key: "geriatrics", label: "Geriatrics", blurb: "Care for older adults" },
  { key: "sports", label: "Sports medicine", blurb: "Musculoskeletal, performance, injury" },
];

const INSURANCE: Array<{ key: IntakeInput["insurancePosture"]; label: string; blurb: string }> = [
  { key: "keep_catastrophic", label: "Keep catastrophic", blurb: "High-deductible or catastrophic plan alongside DPC" },
  { key: "employer_plan", label: "Employer plan", blurb: "I have coverage through work" },
  { key: "no_insurance", label: "No insurance right now", blurb: "DPC only" },
  { key: "hsa_hdhp", label: "HSA / HDHP", blurb: "Pair DPC with an HSA-eligible high-deductible plan" },
];

const AGE_BANDS: IntakeInput["ageBand"][] = ["18-29", "30-44", "45-59", "60-74", "75+"];

function isLikelyCoZip(raw: string): boolean {
  if (!/^\d{5}$/.test(raw.trim())) return false;
  const n = Number.parseInt(raw, 10);
  return n >= 80000 && n <= 81699;
}

export function OnboardingClient({ preselectedDoctorSlug }: { preselectedDoctorSlug: string | null }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, preselectedDoctorSlug });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Hydrate persisted answers (NOT matches, email, payment).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<State>;
      dispatch({
        type: "hydrate",
        value: {
          step: parsed.step ?? 1,
          branch: parsed.branch ?? "continue",
          zip: parsed.zip ?? "",
          ageBand: parsed.ageBand ?? "",
          householdSize: parsed.householdSize ?? 1,
          needs: parsed.needs ?? [],
          insurancePosture: parsed.insurancePosture ?? "",
        },
      });
    } catch {
      // start fresh
    }
  }, []);

  useEffect(() => {
    try {
      const { step, branch, zip, ageBand, householdSize, needs, insurancePosture } = state;
      localStorage.setItem(
        ONBOARDING_LS_KEY,
        JSON.stringify({ step, branch, zip, ageBand, householdSize, needs, insurancePosture }),
      );
    } catch {
      // quota / private mode — skip
    }
  }, [state]);

  function goStep2Submit() {
    setError(null);
    if (!state.zip || !state.ageBand) {
      setError("ZIP and age range are required.");
      return;
    }
    const isCo = isLikelyCoZip(state.zip);
    track("onboarding_step_2_submit", { branch: isCo ? "co" : "waitlist" });
    if (!isCo) {
      track("onboarding_waitlist_entered", { zip: state.zip });
      dispatch({ type: "setBranch", branch: "waitlist" });
      return;
    }
    dispatch({ type: "next" });
  }

  function goStep4Submit() {
    setError(null);
    if (!state.insurancePosture) {
      setError("Pick how you'd pair DPC with insurance (or not).");
      return;
    }
    track("onboarding_step_4_submit", { posture: state.insurancePosture, needs_count: state.needs.length });
    startTransition(async () => {
      try {
        const result = await submitIntakeAction({
          zip: state.zip,
          ageBand: state.ageBand as IntakeInput["ageBand"],
          householdSize: state.householdSize,
          needs: state.needs,
          insurancePosture: state.insurancePosture as IntakeInput["insurancePosture"],
        });
        dispatch({ type: "setMatches", matches: result.matches });
        if (state.preselectedDoctorSlug && result.matches.some((m) => m.doctorSlug === state.preselectedDoctorSlug)) {
          dispatch({ type: "selectDoctor", slug: state.preselectedDoctorSlug });
        }
        dispatch({ type: "next" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function handleSubscribe(email: string) {
    if (!state.selectedDoctorSlug) return;
    setError(null);
    startTransition(async () => {
      try {
        await createSubscriptionAction({
          doctorSlug: state.selectedDoctorSlug as string,
          email,
          plan: "adult",
        });
        track("onboarding_subscription_created", { doctor_slug: state.selectedDoctorSlug });
        try {
          localStorage.removeItem(ONBOARDING_LS_KEY);
        } catch {
          // ignore
        }
        dispatch({ type: "goto", step: 7 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create membership.");
      }
    });
  }

  async function handleWaitlist(email: string) {
    setError(null);
    startTransition(async () => {
      try {
        await submitWaitlistAction({ email, zip: state.zip, source: "onboarding_step2" });
        try {
          localStorage.removeItem(ONBOARDING_LS_KEY);
        } catch {
          // ignore
        }
        dispatch({ type: "goto", step: 7 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join the waitlist.");
      }
    });
  }

  const progressPct = state.branch === "waitlist" ? 100 : (state.step / 7) * 100;

  return (
    <div className="wrap-narrow" style={{ padding: "var(--s-6) 0 var(--s-10)", maxWidth: 720 }}>
      <ProgressBar pct={progressPct} label={state.branch === "waitlist" ? "Waitlist" : `Step ${state.step} of 7`} />

      {error && (
        <div
          role="alert"
          style={{
            padding: "var(--s-3) var(--s-4)",
            background: "color-mix(in oklab, var(--danger) 10%, transparent)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--r-2)",
            color: "var(--danger)",
            fontSize: 13,
            marginTop: "var(--s-4)",
          }}
        >
          {error}
        </div>
      )}

      {state.branch === "waitlist" ? (
        <WaitlistBranch zip={state.zip} onBack={() => dispatch({ type: "setBranch", branch: "continue" })} onSubmit={handleWaitlist} busy={isPending} done={state.step === 7} />
      ) : (
        <>
          {state.step === 1 && <Step1Welcome onNext={() => dispatch({ type: "next" })} />}
          {state.step === 2 && (
            <Step2AboutYou
              state={state}
              dispatch={dispatch}
              onSubmit={goStep2Submit}
              onBack={() => dispatch({ type: "back" })}
            />
          )}
          {state.step === 3 && (
            <Step3Needs
              state={state}
              dispatch={dispatch}
              onSubmit={() => {
                track("onboarding_step_3_submit", { needs_count: state.needs.length });
                dispatch({ type: "next" });
              }}
              onBack={() => dispatch({ type: "back" })}
            />
          )}
          {state.step === 4 && (
            <Step4Insurance
              state={state}
              dispatch={dispatch}
              onSubmit={goStep4Submit}
              onBack={() => dispatch({ type: "back" })}
              busy={isPending}
            />
          )}
          {state.step === 5 && (
            <Step5Matches state={state} dispatch={dispatch} onBack={() => dispatch({ type: "back" })} onNext={() => dispatch({ type: "next" })} />
          )}
          {state.step === 6 && (
            <Step6Membership
              state={state}
              onBack={() => dispatch({ type: "back" })}
              onSubscribe={handleSubscribe}
              busy={isPending}
            />
          )}
          {state.step === 7 && <Step7Confirm />}
        </>
      )}
    </div>
  );
}

// ---------- components ----------

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ marginBottom: "var(--s-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 3, background: "var(--rule)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", transition: "width .25s ease" }} />
      </div>
    </div>
  );
}

function Step1Welcome({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    track("onboarding_start");
  }, []);
  return (
    <div>
      <h1 className="t-h1" style={{ margin: 0 }}>
        Let&apos;s find you a <em>real doctor</em>.
      </h1>
      <p className="t-body-lg" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
        A few quick questions so we can match you with a Colorado DPC clinic that fits. Takes about 3 minutes.
      </p>

      <div
        style={{
          marginTop: "var(--s-5)",
          padding: "var(--s-5)",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--r-3)",
        }}
      >
        <p className="t-mono" style={{ color: "var(--accent-2)", marginBottom: 8 }}>
          About your privacy
        </p>
        <p className="t-body" style={{ color: "var(--ink)" }}>
          RadMedicine isn&apos;t a HIPAA covered entity by design. We never ask for your name, your diagnosis,
          your medications, or your medical history. We collect ZIP, age range, and a checklist of what you&apos;re looking for &mdash;
          that&apos;s it. When you subscribe to a clinic, we hand the clinic your email. Nothing else.
        </p>
      </div>

      <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: "var(--s-6)" }} onClick={onNext}>
        Start &rarr;
      </button>
    </div>
  );
}

function Step2AboutYou({
  state,
  dispatch,
  onSubmit,
  onBack,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        About <em>you</em>.
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginTop: "var(--s-3)" }}>
        ZIP tells us which Colorado clinics are near you. Age range and household size help with matching. Nothing here identifies you.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
        <div>
          <label htmlFor="zip" style={labelStyle}>
            ZIP
          </label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={state.zip}
            onChange={(e) => dispatch({ type: "set", patch: { zip: e.target.value.replace(/\D/g, "").slice(0, 5) } })}
            placeholder="80202"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="age" style={labelStyle}>
            Age range
          </label>
          <select
            id="age"
            value={state.ageBand}
            onChange={(e) => dispatch({ type: "set", patch: { ageBand: e.target.value as IntakeInput["ageBand"] } })}
            style={inputStyle}
          >
            <option value="">Select&hellip;</option>
            {AGE_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="household" style={labelStyle}>
            Household size
          </label>
          <input
            id="household"
            type="number"
            min={1}
            max={20}
            value={state.householdSize}
            onChange={(e) => dispatch({ type: "set", patch: { householdSize: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } })}
            style={inputStyle}
          />
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onSubmit} />
    </div>
  );
}

function Step3Needs({
  state,
  dispatch,
  onSubmit,
  onBack,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        What are you looking for?
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginTop: "var(--s-3)" }}>
        Pick as many as apply. We&apos;ll use these to match you with the right clinic.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
        {NEEDS.map((n) => {
          const checked = state.needs.includes(n.key);
          return (
            <label
              key={n.key}
              style={{
                padding: "var(--s-3) var(--s-4)",
                borderRadius: "var(--r-2)",
                border: `1px solid ${checked ? "var(--primary)" : "var(--rule-2)"}`,
                background: checked ? "color-mix(in oklab, var(--primary) 8%, transparent)" : "var(--bg-elev)",
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => dispatch({ type: "toggleNeed", need: n.key })}
                style={{ marginTop: 3, accentColor: "var(--primary)" }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{n.label}</div>
                <div className="t-small" style={{ color: "var(--ink-3)", marginTop: 2 }}>
                  {n.blurb}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <NavButtons onBack={onBack} onNext={onSubmit} />
    </div>
  );
}

function Step4Insurance({
  state,
  dispatch,
  onSubmit,
  onBack,
  busy,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  onSubmit: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        How do you pair with <em>insurance</em>?
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginTop: "var(--s-3)" }}>
        Most DPC members keep a high-deductible or catastrophic plan alongside their membership. Pick the option that fits.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
        {INSURANCE.map((o) => {
          const checked = state.insurancePosture === o.key;
          return (
            <label
              key={o.key}
              style={{
                padding: "var(--s-3) var(--s-4)",
                borderRadius: "var(--r-2)",
                border: `1px solid ${checked ? "var(--primary)" : "var(--rule-2)"}`,
                background: checked ? "color-mix(in oklab, var(--primary) 8%, transparent)" : "var(--bg-elev)",
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <input
                type="radio"
                name="insurance"
                value={o.key}
                checked={checked}
                onChange={() => dispatch({ type: "set", patch: { insurancePosture: o.key } })}
                style={{ marginTop: 3, accentColor: "var(--primary)" }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{o.label}</div>
                <div className="t-small" style={{ color: "var(--ink-3)", marginTop: 2 }}>
                  {o.blurb}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <NavButtons onBack={onBack} onNext={onSubmit} busy={busy} nextLabel={busy ? "Matching\u2026" : "See matches \u2192"} />
    </div>
  );
}

function Step5Matches({
  state,
  dispatch,
  onBack,
  onNext,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        Your <em>matches</em>.
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", marginTop: "var(--s-3)" }}>
        Pick the doctor you want to start with. No commitment yet &mdash; you can change your mind before the membership starts.
      </p>

      {state.matches.length === 0 ? (
        <p className="t-body" style={{ marginTop: "var(--s-5)", color: "var(--ink-3)" }}>
          No matches yet. Go back and adjust your needs.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", marginTop: "var(--s-5)" }}>
          {state.matches.map((m) => {
            const selected = state.selectedDoctorSlug === m.doctorSlug;
            const priceDollars = m.priceAdultCents != null ? (m.priceAdultCents / 100).toFixed(0) : null;
            return (
              <button
                key={m.doctorSlug}
                type="button"
                onClick={() => {
                  track("onboarding_match_selected", { doctor_slug: m.doctorSlug, match_score: m.matchScore });
                  dispatch({ type: "selectDoctor", slug: m.doctorSlug });
                }}
                className="card"
                style={{
                  textAlign: "left",
                  padding: "var(--s-4)",
                  border: `1px solid ${selected ? "var(--primary)" : "var(--rule)"}`,
                  background: selected ? "color-mix(in oklab, var(--primary) 6%, var(--bg-elev))" : "var(--bg-elev)",
                  display: "grid",
                  gridTemplateColumns: "80px 1fr auto",
                  gap: "var(--s-3)",
                  alignItems: "center",
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                }}
              >
                <div
                  aria-hidden
                  style={{ width: 80, height: 80, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%)" }}
                />
                <div>
                  <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 4 }}>
                    {(m.specialtyName ?? "").toUpperCase()} &middot; {m.city.toUpperCase()}, {m.region}
                  </p>
                  <div style={{ fontFamily: "var(--display)", fontSize: 20, letterSpacing: "-0.015em" }}>{m.displayName}</div>
                  <p className="t-small" style={{ color: "var(--ink-2)", marginTop: 4 }}>
                    {m.matchReason}
                  </p>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="chip" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent-2)" }}>
                    {m.matchScore}% match
                  </span>
                  {priceDollars && (
                    <span style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--primary)" }}>
                      ${priceDollars}
                      <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--sans)" }}>/mo</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue \u2192"
        nextDisabled={!state.selectedDoctorSlug}
      />
    </div>
  );
}

function Step6Membership({
  state,
  onBack,
  onSubscribe,
  busy,
}: {
  state: State;
  onBack: () => void;
  onSubscribe: (email: string) => void;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");
  const chosen = state.matches.find((m) => m.doctorSlug === state.selectedDoctorSlug);

  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        Start your <em>membership</em>.
      </h1>
      {chosen && (
        <p className="t-body" style={{ marginTop: "var(--s-3)", color: "var(--ink-2)" }}>
          With <strong>{chosen.displayName}</strong> &middot; {chosen.clinicName} &middot; {chosen.city}, {chosen.region}.
        </p>
      )}

      <div
        style={{
          marginTop: "var(--s-5)",
          padding: "var(--s-4)",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--r-2)",
          fontSize: 13,
          color: "var(--accent-2)",
        }}
      >
        Only your email is passed to the clinic. Your age range, ZIP, and medical checklist stay with
        RadMedicine &mdash; they&apos;re never linked back to your identity in any way.
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubscribe(email);
        }}
        style={{ marginTop: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-3)" }}
      >
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        <div
          style={{
            padding: "var(--s-4)",
            background: "var(--bg-deep)",
            borderRadius: "var(--r-2)",
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          Beta stub: billing is not yet wired. Clicking subscribe will create your membership record; Stripe checkout lands in Week 4.
        </div>

        <NavButtons
          onBack={onBack}
          busy={busy}
          nextLabel={busy ? "Submitting\u2026" : "Start membership"}
          nextType="submit"
        />
      </form>
    </div>
  );
}

function Step7Confirm() {
  return (
    <div style={{ textAlign: "center", padding: "var(--s-7) 0" }}>
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--primary)",
          color: "var(--primary-ink)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          marginBottom: "var(--s-4)",
        }}
      >
        &#10003;
      </div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        You&apos;re <em>in</em>.
      </h1>
      <p className="t-body-lg" style={{ color: "var(--ink-2)", maxWidth: 480, margin: "var(--s-4) auto 0" }}>
        Check your inbox for a welcome email. The clinic will reach out within 24 hours to schedule your first visit.
      </p>
      <a href="/" className="btn btn-ghost" style={{ marginTop: "var(--s-6)" }}>
        Back home
      </a>
    </div>
  );
}

function WaitlistBranch({
  zip,
  onBack,
  onSubmit,
  busy,
  done,
}: {
  zip: string;
  onBack: () => void;
  onSubmit: (email: string) => void;
  busy: boolean;
  done: boolean;
}) {
  const [email, setEmail] = useState("");
  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s-7) 0" }}>
        <h1 className="t-h2" style={{ margin: 0 }}>
          You&apos;re on the <em>waitlist</em>.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--ink-2)", maxWidth: 480, margin: "var(--s-4) auto 0" }}>
          We&apos;ll email you as soon as RadMedicine is open in your state.
        </p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="t-h2" style={{ margin: 0 }}>
        We&apos;re in <em>Colorado</em> first.
      </h1>
      <p className="t-body-lg" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
        The ZIP you entered ({zip || "\u2014"}) isn&apos;t in Colorado. We&apos;re starting here and expanding
        carefully &mdash; health data laws vary state-by-state and we want to get it right.
      </p>
      <p className="t-body" style={{ marginTop: "var(--s-4)", color: "var(--ink-2)" }}>
        Leave us your email and we&apos;ll tell you the moment we open in your state.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email);
        }}
        style={{ marginTop: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-3)" }}
      >
        <div>
          <label htmlFor="waitlist_email" style={labelStyle}>
            Email
          </label>
          <input
            id="waitlist_email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            &larr; Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Submitting\u2026" : "Join waitlist"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  busy,
  nextLabel = "Continue \u2192",
  nextDisabled,
  nextType = "button",
}: {
  onBack: () => void;
  onNext?: () => void;
  busy?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: "var(--s-6)" }}>
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        &larr; Back
      </button>
      {onNext || nextType === "submit" ? (
        <button type={nextType} className="btn btn-primary" disabled={busy || nextDisabled} onClick={nextType === "button" ? onNext : undefined}>
          {nextLabel}
        </button>
      ) : null}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" };
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
