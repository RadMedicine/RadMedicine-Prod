import "server-only";
import { sendEmail } from "./postmark";
import {
  clinicNewPatientNotifyTemplate,
  onboardingConfirmTemplate,
  paymentReceiptTemplate,
  subscriptionCancelledTemplate,
  waitlistConfirmTemplate,
  welcomeTemplate,
} from "./templates";

/**
 * Domain helpers — ONE function per transactional event. Feature code
 * calls these, never sendEmail directly and never templates.ts
 * directly. This keeps the call sites short and gives every dispatch
 * a consistent Postmark `tag`, which is what Postmark's analytics
 * splits metrics on.
 *
 * All helpers return the same `SendEmailResult` shape as sendEmail so
 * callers can log/route as they see fit. In Beta, POSTMARK_API_KEY is
 * absent and every call logs-and-returns success without dispatching;
 * when Jon's key lands, dispatch turns on with no code changes.
 */

export async function sendOnboardingConfirm(to: string, args: { doctorName: string; clinicName: string; city: string }) {
  const { subject, htmlBody, textBody } = onboardingConfirmTemplate(args);
  return sendEmail({ to, subject, htmlBody, textBody, tag: "onboarding-confirm" });
}

export async function sendWelcome(to: string, args: { doctorName: string; clinicName: string; city: string }) {
  const { subject, htmlBody, textBody } = welcomeTemplate(args);
  return sendEmail({ to, subject, htmlBody, textBody, tag: "welcome" });
}

export async function sendClinicNewPatientNotify(clinicEmail: string, args: { patientEmail: string; clinicName: string; doctorName: string }) {
  const { subject, htmlBody, textBody } = clinicNewPatientNotifyTemplate(args);
  return sendEmail({ to: clinicEmail, subject, htmlBody, textBody, tag: "clinic-new-patient" });
}

export async function sendPaymentReceipt(to: string, args: { doctorName: string; amountCents: number; cardLast4: string }) {
  const { subject, htmlBody, textBody } = paymentReceiptTemplate(args);
  return sendEmail({ to, subject, htmlBody, textBody, tag: "payment-receipt" });
}

export async function sendSubscriptionCancelled(to: string, args: { doctorName: string }) {
  const { subject, htmlBody, textBody } = subscriptionCancelledTemplate(args);
  return sendEmail({ to, subject, htmlBody, textBody, tag: "subscription-cancelled" });
}

export async function sendWaitlistConfirm(to: string, args: { zip: string }) {
  const { subject, htmlBody, textBody } = waitlistConfirmTemplate(args);
  return sendEmail({ to, subject, htmlBody, textBody, tag: "waitlist-confirm" });
}
