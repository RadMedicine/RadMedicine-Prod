/**
 * Temporary type specimen — exercises every design-token font face and
 * verifies the .t-display em → Source Serif 4 italic → terracotta treatment
 * renders correctly. Will be replaced by the real Patient Landing hero in
 * a later task.
 */
export default function Home() {
  return (
    <main className="wrap" style={{ paddingTop: "var(--s-9)", paddingBottom: "var(--s-10)" }}>
      <p className="t-eyebrow">Type specimen · tokens.css</p>

      <h1 className="t-display" style={{ marginTop: "var(--s-5)", maxWidth: 900 }}>
        The doctor who knows <em>you</em>, not your insurance.
      </h1>

      <p className="t-body-lg" style={{ marginTop: "var(--s-6)", maxWidth: 640 }}>
        Young Serif sets the headline. Young Serif has no italic face, so{" "}
        <span className="t-mono">&lt;em&gt;</span> falls back to Source Serif 4 italic —
        colored terracotta by tokens.css. DM Sans handles body and UI copy. JetBrains Mono
        handles eyebrows and data.
      </p>

      <div className="row" style={{ gap: "var(--s-3)", marginTop: "var(--s-6)", flexWrap: "wrap" }}>
        <a className="btn btn-primary">Find a doctor</a>
        <a className="btn btn-accent">For clinics</a>
        <a className="btn btn-ghost">Learn more</a>
      </div>

      <h2 className="t-h2" style={{ marginTop: "var(--s-9)" }}>
        Healthcare, delivered <em>directly</em>.
      </h2>

      <div className="row" style={{ gap: "var(--s-5)", marginTop: "var(--s-6)", flexWrap: "wrap" }}>
        <article className="card" style={{ maxWidth: 320 }}>
          <p className="t-eyebrow">Step 01</p>
          <h3 className="t-h3" style={{ marginTop: "var(--s-3)" }}>Tell us what you need</h3>
          <p className="t-body" style={{ marginTop: "var(--s-3)" }}>
            A few non-identifying details — ZIP, age range, what care you&apos;re after.
          </p>
        </article>
        <article className="card" style={{ maxWidth: 320 }}>
          <p className="t-eyebrow">Step 02</p>
          <h3 className="t-h3" style={{ marginTop: "var(--s-3)" }}>Meet matched doctors</h3>
          <p className="t-body" style={{ marginTop: "var(--s-3)" }}>
            Real DPC physicians in your area, ranked by fit.
          </p>
        </article>
        <article className="card" style={{ maxWidth: 320 }}>
          <p className="t-eyebrow">Step 03</p>
          <h3 className="t-h3" style={{ marginTop: "var(--s-3)" }}>Subscribe directly</h3>
          <p className="t-body" style={{ marginTop: "var(--s-3)" }}>
            Flat monthly fee. Insurance stays for emergencies.
          </p>
        </article>
      </div>
    </main>
  );
}
