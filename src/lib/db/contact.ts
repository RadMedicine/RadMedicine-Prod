import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as pg } from "./client";
import * as schema from "./schema/contact";

/**
 * Drizzle client scoped to the `contact` schema. Patient PII only.
 * Import this ONLY from the billing service, the email service, or the
 * audited admin path. App code rendering public catalog data must never
 * import this module. See ADR 001.
 */
export const db = drizzle(pg, { schema });
export { schema };
