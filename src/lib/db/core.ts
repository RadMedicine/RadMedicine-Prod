import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as pg } from "./client";
import * as schema from "./schema/core";

/**
 * Drizzle client scoped to the `core` schema. Import this from services
 * that render the public catalog, handle subscriptions, or manage
 * clinics/doctors. Never import `contact` or `med` alongside this.
 */
export const db = drizzle(pg, { schema });
export { schema };
