import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db as coreDb } from "@/src/lib/db/core";
import * as core from "@/src/lib/db/schema/core";
import { requireClinicAccess } from "@/src/lib/clinic-auth";
import { getDoctorWithSpecialty, getSpecialties } from "@/src/lib/clinic-data";

type Params = Promise<{ clinicSlug: string }>;

export default async function ProfileEditPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  const { clinic } = await requireClinicAccess(clinicSlug);
  const doctorRow = await getDoctorWithSpecialty(clinic.clinicId);
  const specialties = await getSpecialties();

  async function saveClinic(formData: FormData) {
    "use server";
    const { clinic } = await requireClinicAccess(clinicSlug);
    const name = String(formData.get("name") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const region = String(formData.get("region") ?? "CO").trim();
    const taglineRaw = String(formData.get("tagline") ?? "").trim();
    const yearRaw = String(formData.get("year_opened") ?? "").trim();
    const websiteRaw = String(formData.get("website") ?? "").trim();
    const visible = formData.get("visible") === "on";

    const yearOpened = yearRaw ? Number.parseInt(yearRaw, 10) : null;
    const tagline = taglineRaw || null;
    const website = websiteRaw || null;

    await coreDb
      .update(core.clinics)
      .set({
        name: name || clinic.name,
        city: city || clinic.city,
        region: region || clinic.region,
        tagline,
        website,
        yearOpened: Number.isFinite(yearOpened) ? yearOpened : null,
        visible,
        updatedAt: new Date(),
      })
      .where(eq(core.clinics.id, clinic.clinicId));

    revalidatePath(`/clinic/dashboard/${clinicSlug}`);
    revalidatePath(`/clinic/dashboard/${clinicSlug}/profile`);
  }

  async function saveDoctor(formData: FormData) {
    "use server";
    const { clinic } = await requireClinicAccess(clinicSlug);
    const doctor = await getDoctorWithSpecialty(clinic.clinicId);
    if (!doctor) return;

    const displayName = String(formData.get("display_name") ?? "").trim();
    const credentials = String(formData.get("credentials") ?? "").trim() || null;
    const bio = String(formData.get("bio") ?? "").trim() || null;
    const philosophy = String(formData.get("philosophy") ?? "").trim() || null;
    const languagesRaw = String(formData.get("languages") ?? "").trim();
    const languages = languagesRaw
      ? languagesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const specialtyIdRaw = String(formData.get("specialty_id") ?? "").trim();
    const specialtyId = specialtyIdRaw ? BigInt(specialtyIdRaw) : doctor.doctor.specialtyId;
    const accepting = formData.get("accepting") === "on";
    const panelCapRaw = String(formData.get("panel_cap") ?? "").trim();
    const panelCap = panelCapRaw ? Number.parseInt(panelCapRaw, 10) : null;

    await coreDb
      .update(core.doctors)
      .set({
        displayName: displayName || doctor.doctor.displayName,
        credentials,
        bio,
        philosophy,
        languages,
        specialtyId,
        accepting,
        panelCap: Number.isFinite(panelCap) ? panelCap : null,
        updatedAt: new Date(),
      })
      .where(eq(core.doctors.id, doctor.doctor.id));

    revalidatePath(`/clinic/dashboard/${clinicSlug}`);
    revalidatePath(`/clinic/dashboard/${clinicSlug}/profile`);
  }

  // Re-read for display after any prior edit in this same render.
  const clinicRow = await coreDb.select().from(core.clinics).where(eq(core.clinics.id, clinic.clinicId)).limit(1);
  const currentClinic = clinicRow[0];
  if (!currentClinic) notFound();

  return (
    <div>
      <p className="t-eyebrow">Profile</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-5)" }}>
        Clinic &amp; doctor
      </h1>

      <form action={saveClinic} style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        <h2 className="t-h3" style={{ margin: 0 }}>
          Clinic
        </h2>
        <Field label="Clinic name" name="name" defaultValue={currentClinic.name} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--s-3)" }}>
          <Field label="City" name="city" defaultValue={currentClinic.city} />
          <Field label="State" name="region" defaultValue={currentClinic.region} />
          <Field
            label="Year opened"
            name="year_opened"
            defaultValue={currentClinic.yearOpened != null ? String(currentClinic.yearOpened) : ""}
            placeholder="2022"
          />
        </div>
        <Field label="Tagline" name="tagline" defaultValue={currentClinic.tagline ?? ""} placeholder="Lifestyle-first family medicine" />
        <Field label="Website" name="website" defaultValue={currentClinic.website ?? ""} placeholder="orchardfamilydpc.com" />
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "var(--s-2)" }}>
          <input type="checkbox" name="visible" defaultChecked={currentClinic.visible} style={{ accentColor: "var(--primary)" }} />
          <span style={{ fontSize: 13 }}>Visible in search &amp; on the landing page</span>
        </label>
        <div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--s-3)" }}>
            Save clinic
          </button>
        </div>
      </form>

      {doctorRow && (
        <form action={saveDoctor} style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", marginTop: "var(--s-8)" }}>
          <h2 className="t-h3" style={{ margin: 0 }}>
            Primary doctor
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--s-3)" }}>
            <Field label="Display name" name="display_name" defaultValue={doctorRow.doctor.displayName} />
            <Field label="Credentials" name="credentials" defaultValue={doctorRow.doctor.credentials ?? ""} placeholder="MD MPH" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }} htmlFor="specialty_id">
              Specialty
            </label>
            <select
              id="specialty_id"
              name="specialty_id"
              defaultValue={String(doctorRow.doctor.specialtyId)}
              style={selectStyle}
            >
              {specialties.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea label="Bio" name="bio" defaultValue={doctorRow.doctor.bio ?? ""} />
          <Textarea label="Care philosophy" name="philosophy" defaultValue={doctorRow.doctor.philosophy ?? ""} />
          <Field
            label="Languages (comma-separated)"
            name="languages"
            defaultValue={doctorRow.doctor.languages?.join(", ") ?? ""}
            placeholder="English, Spanish"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <Field label="Panel cap" name="panel_cap" defaultValue={doctorRow.doctor.panelCap != null ? String(doctorRow.doctor.panelCap) : ""} placeholder="500" />
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 22 }}>
              <input type="checkbox" name="accepting" defaultChecked={doctorRow.doctor.accepting} style={{ accentColor: "var(--primary)" }} />
              <span style={{ fontSize: 13 }}>Accepting new patients</span>
            </label>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--s-3)" }}>
              Save doctor
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "var(--r-2)",
  border: "1px solid var(--rule-2)",
  fontFamily: "var(--sans)",
  fontSize: 14,
  background: "var(--bg-elev)",
  color: "var(--ink)",
};

const selectStyle = { ...baseInputStyle };

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} type="text" style={baseInputStyle} />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={4}
        style={{ ...baseInputStyle, resize: "vertical", minHeight: 100 }}
      />
    </div>
  );
}
