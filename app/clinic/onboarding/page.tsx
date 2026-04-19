"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer } from "react";

/**
 * Clinic Onboarding — 6-step flow, ported from the handoff
 * (pages-set2.jsx Onboarding). Wireframe quality per PROJECT_PLAN.
 *
 * Steps: Welcome, Practice basics, Ideal patient, Capacity & goals,
 * Profile & pricing, Review.
 *
 * State + resumption:
 *   - Step index and all field values are persisted to localStorage
 *     under LS_KEY, hydrated on mount.
 *   - This is the CLINIC flow — clinic practice details, not patient
 *     PII — so localStorage is fine here. (Patient onboarding has a
 *     stricter rule; see CLAUDE.md critical rule #6.)
 *
 * Beta scope:
 *   - Manual form state rather than React Hook Form + Zod — keeps the
 *     wireframe dependency-light. Validation pass comes later.
 *   - Step 6 "Submit for review" is inert for now (no DB / API yet).
 */

const LS_KEY = "radmed.clinic-onboarding.v1";

type Field = {
  key: string;
  label: string;
  type: "text" | "select" | "textarea" | "file";
  placeholder?: string;
  options?: string[];
};

type StepDef =
  | { kind: "welcome"; title: string }
  | { kind: "form"; title: string; fields: Field[] }
  | { kind: "review"; title: string };

const STEPS: StepDef[] = [
  { kind: "welcome", title: "Welcome" },
  {
    kind: "form",
    title: "Practice basics",
    fields: [
      { key: "practice_name", label: "Practice name", type: "text", placeholder: "Orchard Family DPC" },
      {
        key: "doctor_name",
        label: "Your name & credentials",
        type: "text",
        placeholder: "Dr. Amaya Okafor, MD MPH",
      },
      { key: "city", label: "City", type: "text", placeholder: "Austin, TX" },
      { key: "year_opened", label: "Year opened as DPC", type: "text", placeholder: "2022" },
      {
        key: "website",
        label: "Website (optional)",
        type: "text",
        placeholder: "orchardfamilydpc.com",
      },
      {
        key: "specialty",
        label: "Primary specialty",
        type: "select",
        options: [
          "Family Medicine",
          "Internal Medicine",
          "Pediatrics",
          "Women's Health",
          "Geriatrics",
          "Sports Medicine",
        ],
      },
    ],
  },
  {
    kind: "form",
    title: "Ideal patient",
    fields: [
      { key: "age_range", label: "Age range you see most", type: "text", placeholder: "30\u201365" },
      {
        key: "core_need",
        label: "Core patient need",
        type: "select",
        options: [
          "Complex chronic care",
          "Preventive / lifestyle medicine",
          "Mental health integration",
          "Pediatrics",
          "Women's health",
          "Geriatrics",
        ],
      },
      {
        key: "insurance_posture",
        label: "Insurance posture",
        type: "select",
        options: ["Self-pay + supplemental", "HSA / HDHP friendly", "No insurance expected", "Mix"],
      },
      {
        key: "ideal_patient",
        label: "Describe your ideal patient in one paragraph",
        type: "textarea",
        placeholder: "Someone who wants a real relationship with their doctor\u2026",
      },
    ],
  },
  {
    kind: "form",
    title: "Capacity & goals",
    fields: [
      { key: "panel_current", label: "Current panel size", type: "text", placeholder: "283" },
      { key: "panel_cap", label: "Panel cap", type: "text", placeholder: "500" },
      { key: "target_monthly", label: "Target new members / month", type: "text", placeholder: "12" },
      {
        key: "video_first",
        label: "Open to video-first patients?",
        type: "select",
        options: ["Yes, within state", "Yes, anywhere licensed", "In-person only"],
      },
    ],
  },
  {
    kind: "form",
    title: "Profile & pricing",
    fields: [
      { key: "price_adult", label: "Membership: adult / month", type: "text", placeholder: "$79" },
      { key: "price_couple", label: "Couple add-on", type: "text", placeholder: "+$65" },
      { key: "price_child", label: "Child / dependent", type: "text", placeholder: "+$45" },
      {
        key: "tagline",
        label: "One-line tagline",
        type: "text",
        placeholder: "Lifestyle-first family medicine",
      },
      { key: "photos", label: "Upload clinic photos", type: "file" },
    ],
  },
  { kind: "review", title: "Review" },
];

const STEP_COUNT = STEPS.length;

type State = {
  step: number;
  values: Record<string, string>;
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "goto"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "setField"; key: string; value: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "goto":
      return { ...state, step: clampStep(action.step) };
    case "next":
      return { ...state, step: clampStep(state.step + 1) };
    case "back":
      return { ...state, step: clampStep(state.step - 1) };
    case "setField":
      return { ...state, values: { ...state.values, [action.key]: action.value } };
  }
}

function clampStep(n: number) {
  return Math.min(STEP_COUNT, Math.max(1, n));
}

const initialState: State = { step: 1, values: {} };

export default function ClinicOnboardingPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<State>;
      if (typeof parsed.step === "number" && parsed.values && typeof parsed.values === "object") {
        dispatch({
          type: "hydrate",
          state: { step: clampStep(parsed.step), values: parsed.values as Record<string, string> },
        });
      }
    } catch {
      // corrupted/partial state — ignore and start fresh
    }
  }, []);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // quota exceeded or private mode — silently skip
    }
  }, [state]);

  const current = STEPS[state.step - 1];

  return (
    <div className="wrap" style={{ padding: "var(--s-7) 0 var(--s-10)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "var(--s-7)", alignItems: "start" }}>
        <aside>
          <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 14 }}>
            Join as a clinic &middot; Step {state.step}/{STEP_COUNT}
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {STEPS.map((s, i) => {
              const n = i + 1;
              const isCurrent = state.step === n;
              const isDone = state.step > n;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "goto", step: n })}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: "var(--r-2)",
                      background: isCurrent ? "var(--accent-soft)" : "transparent",
                      color: isDone ? "var(--ink-4)" : isCurrent ? "var(--primary)" : "var(--ink-2)",
                      border: "none",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: isDone ? "var(--primary)" : isCurrent ? "var(--ink)" : "var(--rule)",
                        color: isDone || isCurrent ? "var(--primary-ink)" : "var(--ink-3)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {isDone ? "\u2713" : n}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isCurrent ? 500 : 400 }}>{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div
            style={{
              marginTop: "var(--s-6)",
              padding: "var(--s-4)",
              background: "var(--bg-deep)",
              borderRadius: "var(--r-2)",
              fontSize: 13,
            }}
          >
            <p className="t-mono" style={{ color: "var(--ink-4)", marginBottom: 8 }}>
              Your onboarding lead
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--forest))",
                }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>Noor Abdelrahman</div>
                <div className="t-small">Growth partner</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
            >
              Schedule a call
            </button>
          </div>
        </aside>

        <main>
          {current.kind === "welcome" && <Welcome onNext={() => dispatch({ type: "next" })} />}
          {current.kind === "form" && (
            <FormStep
              title={current.title}
              fields={current.fields}
              values={state.values}
              onChange={(key, value) => dispatch({ type: "setField", key, value })}
              onBack={() => dispatch({ type: "back" })}
              onNext={() => dispatch({ type: "next" })}
            />
          )}
          {current.kind === "review" && (
            <Review values={state.values} onBack={() => dispatch({ type: "back" })} />
          )}
        </main>
      </div>
    </div>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  const reassurances: [string, string][] = [
    ["No upfront cost", "You owe nothing until a patient enrolls."],
    ["Keep your patients", "We never own the relationship. You do."],
    ["90-day guarantee", "Churn inside 90 days? We refund 100%."],
  ];
  return (
    <div>
      <h1 className="t-h1" style={{ margin: 0, maxWidth: 720 }}>
        Let&apos;s build your <em>patient pipeline</em>.
      </h1>
      <p className="t-body-lg" style={{ marginTop: "var(--s-4)", maxWidth: 640 }}>
        This takes about 12 minutes. We&apos;ll ask about your practice, your ideal patient, and your growth
        goals &mdash; then build a tailored acquisition plan. Nothing is published until you approve it.
      </p>
      <div
        style={{
          marginTop: "var(--s-6)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--s-3)",
        }}
      >
        {reassurances.map(([h, d]) => (
          <div key={h} className="card">
            <p className="t-eyebrow" style={{ color: "var(--primary)", marginBottom: 10 }}>
              &check;
            </p>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, marginBottom: 4, letterSpacing: "-0.01em" }}>
              {h}
            </div>
            <p className="t-small">{d}</p>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: "var(--s-6)" }} onClick={onNext}>
        Start onboarding &rarr;
      </button>
    </div>
  );
}

function FormStep({
  title,
  fields,
  values,
  onChange,
  onBack,
  onNext,
}: {
  title: string;
  fields: Field[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: 36,
          margin: "0 0 var(--s-5)",
          letterSpacing: "-0.02em",
          lineHeight: 1.08,
        }}
      >
        {title}
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {fields.map((f) => (
          <FieldRow key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: "var(--s-6)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          &larr; Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--r-2)",
    border: "1px solid var(--rule-2)",
    fontFamily: "var(--sans)",
    fontSize: 14,
    background: "var(--bg-elev)",
    color: "var(--ink)",
  };
  return (
    <div>
      <label
        htmlFor={field.key}
        style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}
      >
        {field.label}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={field.key}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...baseStyle, minHeight: 100, resize: "vertical" }}
        />
      ) : field.type === "select" ? (
        <select
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={baseStyle}
        >
          <option value="">Select&hellip;</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <div
          style={{
            padding: 28,
            border: "1px dashed var(--rule-2)",
            borderRadius: "var(--r-2)",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: 13,
            background: "var(--bg-elev)",
          }}
        >
          Drop 3&ndash;6 clinic photos here (wireframe &mdash; upload wired in a later pass)
        </div>
      ) : (
        <input
          id={field.key}
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={baseStyle}
        />
      )}
    </div>
  );
}

function Review({ values, onBack }: { values: Record<string, string>; onBack: () => void }) {
  const doctor = values.doctor_name || "Your name & credentials";
  const specialty = values.specialty || "Specialty";
  const city = values.city || "City, ST";
  const tagline = values.tagline || "One-line tagline";
  const price = values.price_adult || "$\u2014";
  const panelCurrent = values.panel_current || "\u2014";
  const panelCap = values.panel_cap || "\u2014";

  const hasSubmitted = useMemo(() => false, []); // Beta: submit is inert

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: 36,
          margin: "0 0 10px",
          letterSpacing: "-0.02em",
          lineHeight: 1.08,
        }}
      >
        Ready to go live.
      </h1>
      <p className="t-body-lg" style={{ maxWidth: 640 }}>
        Review your profile below. Nothing is published until you click approve &mdash; and your onboarding
        lead will walk through it with you on a 20-minute call first.
      </p>

      <div
        className="card"
        style={{ marginTop: "var(--s-5)", display: "grid", gridTemplateColumns: "100px 1fr", gap: 20 }}
      >
        <div
          aria-hidden
          style={{
            width: 100,
            height: 100,
            borderRadius: "var(--r-3)",
            background: "linear-gradient(135deg, var(--accent-soft), var(--accent))",
          }}
        />
        <div>
          <p className="t-mono" style={{ color: "var(--ink-4)" }}>
            {specialty.toUpperCase()} &middot; {city.toUpperCase()}
          </p>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 24,
              letterSpacing: "-0.015em",
              margin: "4px 0",
            }}
          >
            {doctor}
          </div>
          <div style={{ fontStyle: "italic", color: "var(--ink-2)", fontSize: 14 }}>&ldquo;{tagline}&rdquo;</div>
          <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
            <span className="chip">{price} / mo</span>
            <span className="chip chip-dot">Accepting</span>
            <span className="chip">
              Panel {panelCurrent}/{panelCap}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: "var(--s-6)" }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          &larr; Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            // eslint-disable-next-line no-console
            console.info("[onboarding] submit stub — wire to API in a later pass", values);
          }}
        >
          Submit for review &check;
        </button>
        <Link href="/" className="btn btn-ghost">
          Save &amp; exit
        </Link>
      </div>

      {hasSubmitted && (
        <p className="t-small" style={{ marginTop: 20, color: "var(--good)" }}>
          Submitted.
        </p>
      )}
    </div>
  );
}
