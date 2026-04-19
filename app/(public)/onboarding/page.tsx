import { OnboardingClient } from "./onboarding-client";

type SearchParams = Promise<{ doctor?: string }>;

export const metadata = {
  title: "Find a Colorado DPC doctor \u00B7 RadMedicine",
  description: "Tell us your ZIP and what you need. We'll match you with a Colorado direct primary care clinic.",
};

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const { doctor } = await searchParams;
  return <OnboardingClient preselectedDoctorSlug={doctor ?? null} />;
}
