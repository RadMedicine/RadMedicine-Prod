import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";
import { requireClinicAccess } from "@/src/lib/clinic-auth";
import { centsFromDollarsInput, dollarsFromCents, getPrimaryDoctor } from "@/src/lib/clinic-data";

type Params = Promise<{ clinicSlug: string }>;

export default async function PricingEditPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  const { clinic } = await requireClinicAccess(clinicSlug);
  const doctor = await getPrimaryDoctor(clinic.clinicId);

  async function savePricing(formData: FormData) {
    "use server";
    const { clinic } = await requireClinicAccess(clinicSlug);
    const doctor = await getPrimaryDoctor(clinic.clinicId);
    if (!doctor) return;

    const priceAdultCents = centsFromDollarsInput(String(formData.get("price_adult") ?? ""));
    const priceCoupleCents = centsFromDollarsInput(String(formData.get("price_couple") ?? ""));
    const priceChildCents = centsFromDollarsInput(String(formData.get("price_child") ?? ""));

    await coreDb
      .update(core.doctors)
      .set({
        priceAdultCents,
        priceCoupleCents,
        priceChildCents,
        updatedAt: new Date(),
      })
      .where(eq(core.doctors.id, doctor.id));

    revalidatePath(`/clinic/dashboard/${clinicSlug}/pricing`);
  }

  if (!doctor) {
    return (
      <div>
        <p className="t-eyebrow">Pricing</p>
        <h1 className="t-h2" style={{ marginTop: 10 }}>
          No doctor yet.
        </h1>
        <p className="t-body" style={{ marginTop: "var(--s-3)", color: "var(--ink-2)" }}>
          Add a doctor on the Profile tab before setting pricing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="t-eyebrow">Pricing</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-5)" }}>
        Membership pricing
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", maxWidth: 560, marginBottom: "var(--s-5)" }}>
        Enter dollar amounts per month. These prices show on your public clinic profile and in search. Leave blank to hide a tier.
      </p>

      <form action={savePricing} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-3)", maxWidth: 720 }}>
        <PriceField name="price_adult" label="Adult / month" defaultValue={dollarsFromCents(doctor.priceAdultCents)} />
        <PriceField name="price_couple" label="Couple / month" defaultValue={dollarsFromCents(doctor.priceCoupleCents)} />
        <PriceField name="price_child" label="Child / month" defaultValue={dollarsFromCents(doctor.priceChildCents)} />
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="btn btn-primary">
            Save pricing
          </button>
        </div>
      </form>
    </div>
  );
}

function PriceField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={name} style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--rule-2)",
          borderRadius: "var(--r-2)",
          background: "var(--bg-elev)",
          padding: "0 14px",
        }}
      >
        <span className="t-mono" style={{ color: "var(--ink-4)", marginRight: 8 }}>
          $
        </span>
        <input
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder="79.00"
          inputMode="decimal"
          style={{
            flex: 1,
            padding: "10px 0",
            border: 0,
            background: "transparent",
            fontFamily: "var(--sans)",
            fontSize: 14,
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
