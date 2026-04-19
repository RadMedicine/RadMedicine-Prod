import "server-only";
import { auth } from "../auth";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db as coreDb } from "../db/core";
import * as core from "../db/schema/core";
import { db as contactDb } from "../db/contact";
import * as contact from "../db/schema/contact";

/**
 * /admin data helpers.
 *
 * /admin is the deliberate cross-schema read point per ADR 001:
 * operators need to correlate a subscription (core) with the
 * subscriber's email (contact) and with activation fees (core).
 * Every admin touch of contact is written to
 * contact.subscriber_access_log so we can audit who looked at what.
 *
 * Audit granularity for Beta is per-page-load, not per-row. A follow-
 * up can tighten this (e.g. log when a specific email is rendered
 * into a copy-to-clipboard affordance) when the operator surface
 * grows.
 */

export type AdminClinicRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  status: "pending" | "approved" | "paused" | "retired";
  visible: boolean;
  panelCurrent: number;
  panelCap: number | null;
};

export type AdminSubscriptionRow = {
  id: string;
  doctorName: string;
  subscriberEmail: string;
  plan: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "refunded";
  billingPath: "rm_billed" | "clinic_direct";
  priceCents: number | null;
  startedAt: string;
};

export type AdminActivationRow = {
  id: number;
  doctorName: string;
  subscriberEmail: string;
  feeCents: number;
  settledAt: string | null;
  createdAt: string;
};

export async function getAdminClinics(): Promise<AdminClinicRow[]> {
  const rows = await coreDb
    .select({
      id: core.clinics.id,
      slug: core.clinics.slug,
      name: core.clinics.name,
      city: core.clinics.city,
      region: core.clinics.region,
      status: core.clinics.status,
      visible: core.clinics.visible,
      panelCurrent: sql<number>`coalesce(sum(${core.doctors.panelCurrent}), 0)::int`,
      panelCap: sql<number | null>`max(${core.doctors.panelCap})::int`,
    })
    .from(core.clinics)
    .leftJoin(core.doctors, eq(core.doctors.clinicId, core.clinics.id))
    .groupBy(core.clinics.id)
    .orderBy(core.clinics.status, core.clinics.name);
  return rows as AdminClinicRow[];
}

export async function getAdminSubscriptionsWithEmail(): Promise<AdminSubscriptionRow[]> {
  // Step 1: read subscriptions + doctor from core (no PII)
  const subs = await coreDb
    .select({
      id: core.subscriptions.id,
      doctorName: core.doctors.displayName,
      subscriberToken: core.subscriptions.subscriberToken,
      plan: core.subscriptions.plan,
      status: core.subscriptions.status,
      billingPath: core.subscriptions.billingPath,
      priceCents: core.doctors.priceAdultCents,
      startedAt: core.subscriptions.startedAt,
    })
    .from(core.subscriptions)
    .innerJoin(core.doctors, eq(core.doctors.id, core.subscriptions.doctorId))
    .orderBy(desc(core.subscriptions.startedAt))
    .limit(50);

  if (subs.length === 0) return [];

  // Step 2: resolve subscriber_token → email from contact. This is the
  // one place in app code that crosses the core↔contact boundary. Write
  // one audit entry for this page-load's read.
  const tokens = subs.map((s) => s.subscriberToken);
  const contactRows = await contactDb
    .select({ subscriberToken: contact.subscribers.subscriberToken, email: contact.subscribers.email })
    .from(contact.subscribers)
    .where(inArray(contact.subscribers.subscriberToken, tokens));

  const emailByToken = new Map(contactRows.map((r) => [r.subscriberToken, r.email]));
  await writeAdminAccessLog({ action: "read", reason: "admin_subscriptions_page" });

  return subs.map((s) => ({
    id: s.id,
    doctorName: s.doctorName,
    subscriberEmail: emailByToken.get(s.subscriberToken) ?? "\u2014",
    plan: s.plan,
    status: s.status as AdminSubscriptionRow["status"],
    billingPath: s.billingPath as AdminSubscriptionRow["billingPath"],
    priceCents: s.priceCents,
    startedAt: s.startedAt instanceof Date ? s.startedAt.toISOString() : String(s.startedAt),
  }));
}

export async function getAdminActivations(): Promise<AdminActivationRow[]> {
  const rows = await coreDb
    .select({
      id: core.activations.id,
      doctorName: core.doctors.displayName,
      subscriberToken: core.subscriptions.subscriberToken,
      feeCents: core.activations.feeCents,
      settledAt: core.activations.settledAt,
      createdAt: core.activations.createdAt,
    })
    .from(core.activations)
    .innerJoin(core.subscriptions, eq(core.subscriptions.id, core.activations.subscriptionId))
    .innerJoin(core.doctors, eq(core.doctors.id, core.subscriptions.doctorId))
    .orderBy(desc(core.activations.createdAt))
    .limit(50);

  if (rows.length === 0) return [];

  const tokens = rows.map((r) => r.subscriberToken);
  const contactRows = await contactDb
    .select({ subscriberToken: contact.subscribers.subscriberToken, email: contact.subscribers.email })
    .from(contact.subscribers)
    .where(inArray(contact.subscribers.subscriberToken, tokens));

  const emailByToken = new Map(contactRows.map((r) => [r.subscriberToken, r.email]));
  await writeAdminAccessLog({ action: "read", reason: "admin_activations_page" });

  return rows.map((r) => ({
    id: Number(r.id),
    doctorName: r.doctorName,
    subscriberEmail: emailByToken.get(r.subscriberToken) ?? "\u2014",
    feeCents: r.feeCents,
    settledAt: r.settledAt instanceof Date ? r.settledAt.toISOString() : r.settledAt ? String(r.settledAt) : null,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}

export async function getAdminKpis() {
  const [clinicCounts, subCounts, mrrRow] = await Promise.all([
    coreDb
      .select({ status: core.clinics.status, visible: core.clinics.visible, n: sql<number>`count(*)::int` })
      .from(core.clinics)
      .groupBy(core.clinics.status, core.clinics.visible),
    coreDb
      .select({ status: core.subscriptions.status, n: sql<number>`count(*)::int` })
      .from(core.subscriptions)
      .groupBy(core.subscriptions.status),
    coreDb
      .select({
        mrrCents: sql<number>`coalesce(sum(${core.doctors.priceAdultCents}), 0)::int`,
      })
      .from(core.subscriptions)
      .innerJoin(core.doctors, eq(core.doctors.id, core.subscriptions.doctorId))
      .where(sql`${core.subscriptions.status} IN ('active','trialing')`),
  ]);

  const clinicsLive = clinicCounts
    .filter((r) => r.status === "approved" && r.visible)
    .reduce((n, r) => n + Number(r.n), 0);
  const clinicsPending = clinicCounts
    .filter((r) => r.status === "pending")
    .reduce((n, r) => n + Number(r.n), 0);
  const subsActive = subCounts.filter((r) => r.status === "active").reduce((n, r) => n + Number(r.n), 0);
  const mrrCents = Number(mrrRow[0]?.mrrCents ?? 0);

  return { clinicsLive, clinicsPending, subsActive, mrrCents };
}

async function writeAdminAccessLog({
  action,
  reason,
}: {
  action: "read" | "write" | "delete";
  reason: string;
}) {
  // Beta audit granularity: per page-load, not per row. subscriberId
  // stays null here — the `reason` field carries the context ("admin
  // subscriptions page [admin-email]"). Tightening to per-row logging
  // is a straightforward follow-up when operator surface grows.
  try {
    const session = await auth();
    await contactDb.insert(contact.subscriberAccessLog).values({
      actorService: "admin",
      action,
      reason: session?.user?.email ? `${reason} [${session.user.email}]` : reason,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[admin] failed to write subscriber_access_log entry:", err);
  }
}

export function dollars(cents: number | null | undefined): string {
  if (cents == null) return "\u2014";
  return `$${(cents / 100).toFixed(2)}`;
}
