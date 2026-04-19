import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  // Single connection, no prepared statements (Supabase pooler compat).
  const sql = postgres(url, { max: 1, prepare: false });
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
