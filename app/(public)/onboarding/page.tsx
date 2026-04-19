import { OnboardingClient } from "./onboarding-client";

type SearchParams = Promise<{ doctor?: string }>;

export const metadata = {
  title: "Find a Colorado DPC doctor",
  description:
    "Tell us your ZIP and what you need. We'll match you with a Colorado direct primary care clinic \u2014 real pricing, real availability, no surprises.",
  alternates: { canonical: "/onboarding" },
};

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const { doctor } = await searchParams;
  return <OnboardingClient preselectedDoctorSlug={doctor ?? null} />;
}
