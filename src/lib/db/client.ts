import "server-only";
import postgres from "postgres";

/**
 * Shared postgres-js connection.
 *
 * For Beta on Supabase, all three logical schemas (`core` / `contact` /
 * `med`) live in the same database and share one connection string. The
 * PII compartmentalization from ADR 001 is enforced at the MODULE level:
 * services import only the schema-scoped drizzle client they need
 * (`./core`, `./contact`, or `./med`), and cross-schema joins from app
 * code are a code-review red flag.
 *
 * Post-Beta, when we move off managed Postgres or tighten compliance,
 * we swap to distinct role-scoped connection strings per schema. The
 * module boundary keeps that swap a config change, not a rewrite.
 */
const connectionString = process.env.DATABASE_URL;
const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!connectionString && !isNextBuildPhase) {
  throw new Error(
    "DATABASE_URL is not set. Configure .env.local with your Supabase Postgres connection string.",
  );
}

// Supabase connection pooler needs prepared:false when using transaction mode.
// Safe default for Beta — we're not heavily relying on server-side prepared
// statement caching and Supabase pgBouncer in transaction mode doesn't support them.
//
// Build-phase fallback (`postgres://unset`) keeps module import non-fatal when
// the Docker builder runs `next build` without runtime secrets — any DB call
// in a statically-rendered path still fails at query time (caught by the
// homepage `safe()` wrapper), but the build itself doesn't crash on import.
export const sql = postgres(connectionString ?? "postgres://unset", {
  prepare: false,
});
