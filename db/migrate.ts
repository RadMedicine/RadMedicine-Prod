import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Runs against DIRECT_URL (direct Supabase port 5432) if
 * set, falling back to DATABASE_URL. The direct connection is
 * required because Supabase's pooler in transaction mode doesn't
 * support the session-level features Drizzle's migrator relies on
 * (CREATE SCHEMA, advisory locks, etc.).
 */
async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DIRECT_URL (or DATABASE_URL) is not set. See .env.example.");
    process.exit(1);
  }

  if (url.includes(":6543/") || url.includes("pgbouncer=true")) {
    console.warn(
      "[migrate] warning: using a POOLER connection string. Migrations may fail. Set DIRECT_URL to the direct :5432 URL for reliability.",
    );
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations from db/migrations ...");
  await migrate(db, { migrationsFolder: "db/migrations" });
  console.log("Migrations complete.");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
