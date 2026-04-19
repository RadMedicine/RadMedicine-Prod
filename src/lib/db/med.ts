import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as pg } from "./client";
import * as schema from "./schema/med";

/**
 * Drizzle client scoped to the `med` schema. Onboarding intake only.
 * Import this ONLY from the matching service. The intake_id ↔
 * subscriber_token link lives transiently inside one matching request;
 * never persisted, never logged. See ADR 001.
 */
export const db = drizzle(pg, { schema });
export { schema };
