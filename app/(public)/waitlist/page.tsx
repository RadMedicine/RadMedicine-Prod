import type { Metadata } from "next";
import { WaitlistClient } from "./waitlist-client";

type SearchParams = Promise<{ zip?: string; email?: string }>;

export const metadata: Metadata = {
  title: "Join the waitlist \u00B7 RadMedicine",
  description:
    "RadMedicine launched in Colorado first. Leave your email and we'll tell you the moment we open in your state.",
};

/**
 * Standalone /waitlist — direct-entry form for non-CO visitors.
 * Complements the non-CO branch at /onboarding step 2 with a cleaner
 * deep-link target we can surface from the Footer and non-CO
 * acquisition channels. Uses the shared submitWaitlistAction with
 * source="waitlist_direct" so analytics can distinguish.
 */
export default async function WaitlistPage({ searchParams }: { searchParams: SearchParams }) {
  const { zip, email } = await searchParams;
  return <WaitlistClient initialZip={zip ?? ""} initialEmail={email ?? ""} />;
}
