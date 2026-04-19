/**
 * Beta-only seed data for the /admin wireframe. Replaces real queries
 * until the DB is provisioned (Week 2 per PROJECT_PLAN). Shapes mirror
 * db/schema.sql so the later swap to real data is a one-for-one
 * replacement.
 *
 * NOTE: the "contact" rows here carry an email field for the Beta
 * wireframe. In production, admin reads of contact.subscribers are
 * audit-logged (see ADR 001) — the swap happens in the data layer, not
 * the view.
 */

export type AdminClinicRow = {
  id: string;
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
  subscriberEmail: string; // comes from contact.subscribers via audited read
  plan: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "refunded";
  billingPath: "rm_billed" | "clinic_direct";
  priceCents: number;
  startedAt: string; // ISO
};

export type AdminActivationRow = {
  id: number;
  doctorName: string;
  subscriberEmail: string;
  feeCents: number;
  settledAt: string | null;
  createdAt: string;
};

export const SEED_CLINICS: AdminClinicRow[] = [
  {
    id: "cl_okafor",
    name: "Orchard Family DPC",
    city: "Austin",
    region: "TX",
    status: "approved",
    visible: true,
    panelCurrent: 283,
    panelCap: 500,
  },
  {
    id: "cl_lindqvist",
    name: "Lindqvist Internal Medicine",
    city: "Portland",
    region: "OR",
    status: "approved",
    visible: true,
    panelCurrent: 142,
    panelCap: 300,
  },
  {
    id: "cl_ramachandran",
    name: "Ramachandran Pediatrics",
    city: "Charlotte",
    region: "NC",
    status: "pending",
    visible: false,
    panelCurrent: 0,
    panelCap: 250,
  },
  {
    id: "cl_doyle",
    name: "Doyle Women's Health",
    city: "Round Rock",
    region: "TX",
    status: "approved",
    visible: true,
    panelCurrent: 91,
    panelCap: 200,
  },
  {
    id: "cl_lenoir",
    name: "Lenoir Concierge Primary Care",
    city: "Austin",
    region: "TX",
    status: "paused",
    visible: false,
    panelCurrent: 56,
    panelCap: 150,
  },
];

export const SEED_SUBSCRIPTIONS: AdminSubscriptionRow[] = [
  {
    id: "sub_01",
    doctorName: "Dr. Amaya Okafor",
    subscriberEmail: "a.morales@example.com",
    plan: "adult",
    status: "active",
    billingPath: "rm_billed",
    priceCents: 7900,
    startedAt: "2026-04-14T15:22:00Z",
  },
  {
    id: "sub_02",
    doctorName: "Dr. Henrik Lindqvist",
    subscriberEmail: "j.nguyen@example.com",
    plan: "adult",
    status: "trialing",
    billingPath: "rm_billed",
    priceCents: 9500,
    startedAt: "2026-04-18T08:44:00Z",
  },
  {
    id: "sub_03",
    doctorName: "Dr. Saoirse Doyle",
    subscriberEmail: "r.kato@example.com",
    plan: "adult",
    status: "active",
    billingPath: "rm_billed",
    priceCents: 11000,
    startedAt: "2026-04-10T12:01:00Z",
  },
  {
    id: "sub_04",
    doctorName: "Dr. Amaya Okafor",
    subscriberEmail: "s.patel@example.com",
    plan: "adult",
    status: "past_due",
    billingPath: "rm_billed",
    priceCents: 7900,
    startedAt: "2026-03-22T19:13:00Z",
  },
];

export const SEED_ACTIVATIONS: AdminActivationRow[] = [
  {
    id: 1,
    doctorName: "Dr. Amaya Okafor",
    subscriberEmail: "a.morales@example.com",
    feeCents: 2500,
    settledAt: null,
    createdAt: "2026-04-14T15:22:00Z",
  },
  {
    id: 2,
    doctorName: "Dr. Henrik Lindqvist",
    subscriberEmail: "j.nguyen@example.com",
    feeCents: 2500,
    settledAt: null,
    createdAt: "2026-04-18T08:44:00Z",
  },
];

export function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
