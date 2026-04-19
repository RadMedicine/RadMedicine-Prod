import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only needs the schema files; the URL is only
// consumed by `migrate` / `push` / `studio`. Fall back to a placeholder
// so generate doesn't require a live DB.
const url = process.env.DATABASE_URL ?? "postgresql://placeholder@localhost/placeholder";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/*.ts",
  out: "./db/migrations",
  dbCredentials: { url },
  schemaFilter: ["core", "contact", "med"],
  verbose: true,
  strict: true,
});
