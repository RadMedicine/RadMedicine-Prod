import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";
import { abs } from "@/src/lib/seo";

export const revalidate = 3600; // regenerate hourly

/**
 * Sitemap — static marketing routes + dynamic doctor profile routes for
 * every approved + visible clinic. /admin, /clinic/dashboard, /sign-in,
 * and /api are excluded (also blocked in robots.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: abs("/for-clinics"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: abs("/search"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/onboarding"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/waitlist"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: abs("/clinic/onboarding"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  let doctorRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await coreDb
      .select({ slug: core.doctors.slug, updatedAt: core.doctors.updatedAt })
      .from(core.doctors)
      .innerJoin(core.clinics, eq(core.clinics.id, core.doctors.clinicId))
      .where(and(eq(core.clinics.status, "approved"), eq(core.clinics.visible, true)));

    doctorRoutes = rows.map((r) => ({
      url: abs(`/doctors/${r.slug}`),
      lastModified: r.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (err) {
    // Don't fail the sitemap build if the DB is unreachable — marketing
    // pages should still be discoverable.
    // eslint-disable-next-line no-console
    console.error("[sitemap] doctor routes unavailable:", err instanceof Error ? err.message : err);
  }

  return [...staticRoutes, ...doctorRoutes];
}
