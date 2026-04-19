import { revalidatePath } from "next/cache";
import { requireClinicAccess } from "@/src/lib/clinic-auth";
import {
  getAvailabilityForDoctor,
  getPrimaryDoctor,
  minutesFromTime,
  replaceAvailability,
  timeFromMinutes,
} from "@/src/lib/clinic-data";

type Params = Promise<{ clinicSlug: string }>;

const DAYS: Array<{ dow: number; label: string }> = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
];

export default async function AvailabilityEditPage({ params }: { params: Params }) {
  const { clinicSlug } = await params;
  const { clinic } = await requireClinicAccess(clinicSlug);
  const doctor = await getPrimaryDoctor(clinic.clinicId);

  const rows = doctor ? await getAvailabilityForDoctor(doctor.id) : [];
  // First row per day wins for the simple editor (Beta: one window per day).
  const currentByDow = new Map<number, { startMin: number; endMin: number }>();
  for (const r of rows) {
    if (!currentByDow.has(r.dayOfWeek)) {
      currentByDow.set(r.dayOfWeek, { startMin: r.startMin, endMin: r.endMin });
    }
  }

  async function saveAvailability(formData: FormData) {
    "use server";
    const { clinic } = await requireClinicAccess(clinicSlug);
    const doctor = await getPrimaryDoctor(clinic.clinicId);
    if (!doctor) return;

    const next: Array<{ dayOfWeek: number; startMin: number; endMin: number }> = [];
    for (const d of DAYS) {
      const open = formData.get(`open_${d.dow}`) === "on";
      if (!open) continue;
      const start = minutesFromTime(String(formData.get(`start_${d.dow}`) ?? ""));
      const end = minutesFromTime(String(formData.get(`end_${d.dow}`) ?? ""));
      if (start == null || end == null || end <= start) continue;
      next.push({ dayOfWeek: d.dow, startMin: start, endMin: end });
    }

    await replaceAvailability(doctor.id, next);
    revalidatePath(`/clinic/dashboard/${clinicSlug}/availability`);
  }

  if (!doctor) {
    return (
      <div>
        <p className="t-eyebrow">Availability</p>
        <h1 className="t-h2" style={{ marginTop: 10 }}>
          No doctor yet.
        </h1>
        <p className="t-body" style={{ marginTop: "var(--s-3)", color: "var(--ink-2)" }}>
          Add a doctor on the Profile tab before setting availability.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="t-eyebrow">Availability</p>
      <h1 className="t-h2" style={{ marginTop: 10, marginBottom: "var(--s-5)" }}>
        Weekly schedule
      </h1>
      <p className="t-body" style={{ color: "var(--ink-2)", maxWidth: 560, marginBottom: "var(--s-5)" }}>
        One open window per day. Uncheck a day to mark it closed. 24-hour format ({timeFromMinutes(9 * 60)}\u2013{timeFromMinutes(17 * 60)}).
      </p>

      <form action={saveAvailability} style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
        {DAYS.map((d) => {
          const current = currentByDow.get(d.dow);
          const isOpen = Boolean(current);
          return (
            <div
              key={d.dow}
              style={{
                display: "grid",
                gridTemplateColumns: "140px auto 1fr 1fr",
                gap: "var(--s-3)",
                alignItems: "center",
                padding: "var(--s-3) var(--s-4)",
                background: "var(--bg-elev)",
                border: "1px solid var(--rule)",
                borderRadius: "var(--r-2)",
              }}
            >
              <strong style={{ fontSize: 14 }}>{d.label}</strong>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" name={`open_${d.dow}`} defaultChecked={isOpen} style={{ accentColor: "var(--primary)" }} />
                Open
              </label>
              <TimeField name={`start_${d.dow}`} label="Opens" defaultValue={current ? timeFromMinutes(current.startMin) : "09:00"} />
              <TimeField name={`end_${d.dow}`} label="Closes" defaultValue={current ? timeFromMinutes(current.endMin) : "17:00"} />
            </div>
          );
        })}
        <div style={{ marginTop: "var(--s-3)" }}>
          <button type="submit" className="btn btn-primary">
            Save schedule
          </button>
        </div>
      </form>
    </div>
  );
}

function TimeField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ink-3)" }}>
      {label}
      <input
        type="time"
        name={name}
        defaultValue={defaultValue}
        style={{
          padding: "8px 10px",
          border: "1px solid var(--rule-2)",
          borderRadius: "var(--r-2)",
          background: "var(--bg)",
          fontFamily: "var(--sans)",
          fontSize: 14,
          color: "var(--ink)",
        }}
      />
    </label>
  );
}
