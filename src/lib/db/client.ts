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

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Configure .env.local with your Supabase Postgres connection string.",
  );
}

// Supabase connection pooler needs prepared:false when using transaction mode.
// Safe default for Beta — we're not heavily relying on server-side prepared
// statement caching and Supabase pgBouncer in transaction mode doesn't support them.
export const sql = postgres(connectionString, {
  prepare: false,
});
