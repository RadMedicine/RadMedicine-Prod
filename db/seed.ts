import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import * as core from "../src/lib/db/schema/core";
import * as contact from "../src/lib/db/schema/contact";

/**
 * Beta placeholder seed. Deterministic — safe to re-run.
 *
 * This seed is for local dev and Jon's QA walkthrough only. Jon will
 * replace these 10 placeholder clinics with the real Beta clinic roster
 * during QA, via the /clinic/dashboard editing surface.
 *
 * All clinics are Colorado per the CO-only Beta geofence.
 */

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log("Seeding specialties ...");
  await db
    .insert(core.specialties)
    .values([
      { slug: "family-medicine", name: "Family Medicine", displayOrder: 10 },
      { slug: "internal-medicine", name: "Internal Medicine", displayOrder: 20 },
      { slug: "pediatrics", name: "Pediatrics", displayOrder: 30 },
      { slug: "womens-health", name: "Women's Health", displayOrder: 40 },
      { slug: "geriatrics", name: "Geriatrics", displayOrder: 50 },
      { slug: "sports-medicine", name: "Sports Medicine", displayOrder: 60 },
    ])
    .onConflictDoNothing();

  // Re-read so we have the generated bigints (idempotent).
  const specRows = await db.select().from(core.specialties);
  const specBySlug = new Map(specRows.map((r) => [r.slug, r.id]));

  // 10 CO clinics. Doctor names/languages/price points are plausible
  // placeholders, not real.
  const clinicSeeds: Array<{
    clinicSlug: string;
    clinicName: string;
    city: string;
    tagline: string;
    yearOpened: number;
    status: "approved" | "pending" | "paused";
    visible: boolean;
    doctor: {
      slug: string;
      displayName: string;
      credentials: string;
      specialty: string;
      philosophy: string;
      languages: string[];
      panelCurrent: number;
      panelCap: number;
      accepting: boolean;
      priceAdultCents: number;
      priceCoupleCents?: number;
      priceChildCents?: number;
    };
  }> = [
    {
      clinicSlug: "orchard-family-dpc",
      clinicName: "Orchard Family DPC",
      city: "Denver",
      tagline: "Lifestyle-first family medicine",
      yearOpened: 2022,
      status: "approved",
      visible: true,
      doctor: {
        slug: "amaya-okafor",
        displayName: "Dr. Amaya Okafor",
        credentials: "MD MPH",
        specialty: "family-medicine",
        philosophy: "Whole-person, lifestyle-first care.",
        languages: ["English", "Yoruba"],
        panelCurrent: 283,
        panelCap: 500,
        accepting: true,
        priceAdultCents: 7900,
        priceCoupleCents: 14500,
        priceChildCents: 4500,
      },
    },
    {
      clinicSlug: "highline-internal-medicine",
      clinicName: "Highline Internal Medicine",
      city: "Boulder",
      tagline: "Evidence-based, low-intervention",
      yearOpened: 2020,
      status: "approved",
      visible: true,
      doctor: {
        slug: "henrik-lindqvist",
        displayName: "Dr. Henrik Lindqvist",
        credentials: "MD",
        specialty: "internal-medicine",
        philosophy: "Evidence over intervention.",
        languages: ["English", "Swedish"],
        panelCurrent: 142,
        panelCap: 300,
        accepting: true,
        priceAdultCents: 9500,
      },
    },
    {
      clinicSlug: "mesa-pediatrics",
      clinicName: "Mesa Pediatrics",
      city: "Fort Collins",
      tagline: "Family-centered, developmental",
      yearOpened: 2019,
      status: "approved",
      visible: true,
      doctor: {
        slug: "priya-ramachandran",
        displayName: "Dr. Priya Ramachandran",
        credentials: "MD FAAP",
        specialty: "pediatrics",
        philosophy: "Family-centered pediatric care.",
        languages: ["English", "Tamil", "Hindi"],
        panelCurrent: 201,
        panelCap: 350,
        accepting: true,
        priceAdultCents: 6500,
        priceChildCents: 4500,
      },
    },
    {
      clinicSlug: "front-range-family-care",
      clinicName: "Front Range Family Care",
      city: "Colorado Springs",
      tagline: "Steady hands, honest answers",
      yearOpened: 2021,
      status: "approved",
      visible: true,
      doctor: {
        slug: "marcus-lenoir",
        displayName: "Dr. Marcus Lenoir",
        credentials: "MD",
        specialty: "family-medicine",
        philosophy: "The relationship comes first.",
        languages: ["English", "French"],
        panelCurrent: 56,
        panelCap: 150,
        accepting: true,
        priceAdultCents: 8900,
      },
    },
    {
      clinicSlug: "summit-womens-health",
      clinicName: "Summit Women's Health",
      city: "Boulder",
      tagline: "Integrative, hormonal health",
      yearOpened: 2023,
      status: "approved",
      visible: true,
      doctor: {
        slug: "saoirse-doyle",
        displayName: "Dr. Saoirse Doyle",
        credentials: "MD",
        specialty: "womens-health",
        philosophy: "Integrative women's care across life stages.",
        languages: ["English"],
        panelCurrent: 91,
        panelCap: 200,
        accepting: true,
        priceAdultCents: 11000,
      },
    },
    {
      clinicSlug: "quiet-mountain-dpc",
      clinicName: "Quiet Mountain DPC",
      city: "Longmont",
      tagline: "Unrushed primary care",
      yearOpened: 2022,
      status: "approved",
      visible: true,
      doctor: {
        slug: "tomas-alvarez",
        displayName: "Dr. Tomas Alvarez",
        credentials: "MD",
        specialty: "family-medicine",
        philosophy: "Long visits, short waits.",
        languages: ["English", "Spanish"],
        panelCurrent: 110,
        panelCap: 400,
        accepting: true,
        priceAdultCents: 7500,
        priceCoupleCents: 13900,
      },
    },
    {
      clinicSlug: "cherry-creek-geriatrics",
      clinicName: "Cherry Creek Geriatrics",
      city: "Denver",
      tagline: "Care that knows your history",
      yearOpened: 2018,
      status: "approved",
      visible: true,
      doctor: {
        slug: "ingrid-brooks",
        displayName: "Dr. Ingrid Brooks",
        credentials: "MD",
        specialty: "geriatrics",
        philosophy: "Dignified, thorough geriatric care.",
        languages: ["English"],
        panelCurrent: 118,
        panelCap: 200,
        accepting: true,
        priceAdultCents: 12500,
      },
    },
    {
      clinicSlug: "arkansas-river-internal",
      clinicName: "Arkansas River Internal Medicine",
      city: "Pueblo",
      tagline: "Thoughtful, deliberate care",
      yearOpened: 2024,
      status: "pending",
      visible: false,
      doctor: {
        slug: "naomi-bishop",
        displayName: "Dr. Naomi Bishop",
        credentials: "MD",
        specialty: "internal-medicine",
        philosophy: "Careful thinking, careful medicine.",
        languages: ["English"],
        panelCurrent: 0,
        panelCap: 300,
        accepting: true,
        priceAdultCents: 8500,
      },
    },
    {
      clinicSlug: "windsong-sports-med",
      clinicName: "Windsong Sports Medicine",
      city: "Loveland",
      tagline: "Keep moving",
      yearOpened: 2021,
      status: "approved",
      visible: true,
      doctor: {
        slug: "eli-park",
        displayName: "Dr. Eli Park",
        credentials: "DO",
        specialty: "sports-medicine",
        philosophy: "Performance longevity.",
        languages: ["English", "Korean"],
        panelCurrent: 73,
        panelCap: 200,
        accepting: true,
        priceAdultCents: 9900,
      },
    },
    {
      clinicSlug: "red-rocks-family-dpc",
      clinicName: "Red Rocks Family DPC",
      city: "Lakewood",
      tagline: "Primary care, delivered directly",
      yearOpened: 2020,
      status: "approved",
      visible: true,
      doctor: {
        slug: "jordan-ellis",
        displayName: "Dr. Jordan Ellis",
        credentials: "MD",
        specialty: "family-medicine",
        philosophy: "Know your doctor. Know your care.",
        languages: ["English"],
        panelCurrent: 165,
        panelCap: 400,
        accepting: true,
        priceAdultCents: 7900,
        priceCoupleCents: 14500,
        priceChildCents: 4500,
      },
    },
  ];

  console.log("Seeding clinics + doctors ...");
  for (const c of clinicSeeds) {
    const specId = specBySlug.get(c.doctor.specialty);
    if (!specId) throw new Error(`unknown specialty slug: ${c.doctor.specialty}`);

    const [clinic] = await db
      .insert(core.clinics)
      .values({
        slug: c.clinicSlug,
        name: c.clinicName,
        city: c.city,
        region: "CO",
        yearOpened: c.yearOpened,
        status: c.status,
        visible: c.visible,
        tagline: c.tagline,
      })
      .onConflictDoNothing({ target: core.clinics.slug })
      .returning({ id: core.clinics.id });

    const clinicId =
      clinic?.id ??
      (await db.select({ id: core.clinics.id }).from(core.clinics).where(eq(core.clinics.slug, c.clinicSlug)))[0]?.id;
    if (!clinicId) throw new Error(`failed to resolve clinic id for ${c.clinicSlug}`);

    await db
      .insert(core.doctors)
      .values({
        clinicId,
        slug: c.doctor.slug,
        displayName: c.doctor.displayName,
        credentials: c.doctor.credentials,
        specialtyId: specId,
        philosophy: c.doctor.philosophy,
        languages: c.doctor.languages,
        panelCurrent: c.doctor.panelCurrent,
        panelCap: c.doctor.panelCap,
        accepting: c.doctor.accepting,
        priceAdultCents: c.doctor.priceAdultCents,
        priceCoupleCents: c.doctor.priceCoupleCents ?? null,
        priceChildCents: c.doctor.priceChildCents ?? null,
      })
      .onConflictDoNothing({ target: core.doctors.slug });
  }

  console.log("Seeding availability (Mon-Fri 9-17 for accepting doctors) ...");
  const acceptingDoctors = await db.select().from(core.doctors).where(eq(core.doctors.accepting, true));
  for (const d of acceptingDoctors) {
    for (let dow = 1; dow <= 5; dow++) {
      await db
        .insert(core.availability)
        .values({ doctorId: d.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 17 * 60 })
        .onConflictDoNothing();
    }
  }

  console.log("Seeding reviews ...");
  const reviewSeed: Array<{ doctorSlug: string; rating: number; body: string }> = [
    {
      doctorSlug: "amaya-okafor",
      rating: 5,
      body: "First primary care doctor who has actually had time to listen in years.",
    },
    {
      doctorSlug: "amaya-okafor",
      rating: 5,
      body: "She remembered my mother's history without looking it up. That mattered.",
    },
    { doctorSlug: "henrik-lindqvist", rating: 5, body: "Careful, patient, evidence-based. A breath of fresh air." },
    {
      doctorSlug: "priya-ramachandran",
      rating: 5,
      body: "My kids love her. I love that she texts back within an hour.",
    },
    { doctorSlug: "saoirse-doyle", rating: 5, body: "She doesn't rush. She explains. She's available." },
    { doctorSlug: "jordan-ellis", rating: 4, body: "Straightforward, unpretentious care." },
  ];
  for (const r of reviewSeed) {
    const doc = await db.select({ id: core.doctors.id }).from(core.doctors).where(eq(core.doctors.slug, r.doctorSlug));
    if (!doc[0]) continue;
    await db
      .insert(core.reviews)
      .values({ doctorId: doc[0].id, rating: r.rating, body: r.body })
      .onConflictDoNothing();
  }

  console.log("Seeding subscriptions + matching contact subscribers ...");
  const subscribersSeed: Array<{ doctorSlug: string; email: string; plan: string; status: "active" | "trialing" | "past_due" }> = [
    { doctorSlug: "amaya-okafor", email: "a.morales@example.com", plan: "adult", status: "active" },
    { doctorSlug: "henrik-lindqvist", email: "j.nguyen@example.com", plan: "adult", status: "trialing" },
    { doctorSlug: "saoirse-doyle", email: "r.kato@example.com", plan: "adult", status: "active" },
    { doctorSlug: "amaya-okafor", email: "s.patel@example.com", plan: "adult", status: "past_due" },
  ];
  for (const s of subscribersSeed) {
    const doc = await db.select({ id: core.doctors.id }).from(core.doctors).where(eq(core.doctors.slug, s.doctorSlug));
    if (!doc[0]) continue;
    const token = randomUUID();
    await db
      .insert(core.subscriptions)
      .values({ doctorId: doc[0].id, subscriberToken: token, plan: s.plan, status: s.status })
      .onConflictDoNothing({ target: core.subscriptions.subscriberToken });
    await db
      .insert(contact.subscribers)
      .values({ subscriberToken: token, email: s.email })
      .onConflictDoNothing({ target: contact.subscribers.subscriberToken });
  }

  console.log("Seeding waitlist signups (non-CO) ...");
  await db
    .insert(contact.waitlistSignups)
    .values([
      { email: "patient-ny@example.com", zip: "10001", source: "onboarding_step2" },
      { email: "patient-tx@example.com", zip: "78701", source: "onboarding_step2" },
    ])
    .onConflictDoNothing();

  console.log("Seeding admin user + clinic_users (Jon owns all 10 Beta clinics for QA) ...");
  // Jon's admin user, pre-seeded so his first magic-link sign-in picks
  // up the existing row instead of creating a new one. clinic_users
  // rows link him to every clinic so he can QA /clinic/dashboard
  // against any of them.
  const jonEmail = "jon@radmedicine.io";
  await db
    .insert(core.users)
    .values({ email: jonEmail, name: "Jon Tallman" })
    .onConflictDoNothing({ target: core.users.email });

  const [jonUser] = await db.select({ id: core.users.id }).from(core.users).where(eq(core.users.email, jonEmail));
  if (!jonUser) throw new Error("failed to insert/read Jon's seeded user");

  const allClinics = await db.select({ id: core.clinics.id }).from(core.clinics);
  for (const c of allClinics) {
    await db
      .insert(core.clinicUsers)
      .values({ userId: jonUser.id, clinicId: c.id, role: "owner" })
      .onConflictDoNothing();
  }

  console.log("Done.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
