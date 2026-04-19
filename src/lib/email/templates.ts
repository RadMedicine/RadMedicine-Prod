import "server-only";

/**
 * Transactional email templates.
 *
 * Templates are plain HTML + text rendered in TS — no MJML / external
 * engine for Beta. Brand voice lives in copy, not heavy layout. Voice
 * per marketing/positioning-brief.md §5:
 *   - short, plain, concrete nouns
 *   - no exclamation points
 *   - italic accents carry verbs, not decoration
 *   - insurance is the foil, not the adversary
 *   - no dollar-savings claims
 *
 * Six templates ship here (PROJECT_PLAN Workstream E):
 *   magicLink                   — auth sign-in link
 *   onboardingConfirm           — patient finished onboarding (pre-welcome)
 *   welcome                     — subscription created
 *   clinicNewPatientNotify      — clinic: you have a new patient
 *   paymentReceipt              — after Stripe charge (Week 4)
 *   subscriptionCancelled       — patient or admin cancelled
 *   waitlistConfirm             — non-CO patient joined the waitlist
 *
 * Each template returns { subject, htmlBody, textBody }. Call sites
 * import the domain helper from ./transactional, not this file directly.
 */

const SHELL_OPEN = `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2c3e2e;background:#faf7f2;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e0d2;border-radius:14px;padding:32px">`;

const SHELL_CLOSE = `
  </div>
</body></html>`;

function button(href: string, label: string) {
  return `<p style="margin:0 0 24px"><a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#5a8a6e;color:#faf7f2;text-decoration:none;font-weight:500">${label}</a></p>`;
}

function h1(copy: string) {
  return `<h1 style="font-family:'Young Serif',Georgia,serif;font-size:26px;letter-spacing:-0.015em;margin:0 0 14px;color:#2c3e2e;line-height:1.15">${copy}</h1>`;
}

function small(copy: string) {
  return `<p style="margin:0;color:#a2ad9f;font-size:12px;line-height:1.5">${copy}</p>`;
}

function rule() {
  return `<hr style="margin:24px 0;border:0;height:1px;background:#e6e0d2" />`;
}

// ---------- templates ----------

export function magicLinkTemplate({ signInUrl, hostname }: { signInUrl: string; hostname: string }) {
  const subject = `Your RadMedicine sign-in link`;
  const textBody = [
    `Sign in to RadMedicine`,
    ``,
    `Click this link to finish signing in:`,
    signInUrl,
    ``,
    `The link is good for the next 10 minutes. If you didn't request it,`,
    `you can ignore this email.`,
    ``,
    `— RadMedicine (${hostname})`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("Sign in to RadMedicine"),
    `<p style="margin:0 0 20px;line-height:1.55">Click the button below to finish signing in. The link is good for the next 10 minutes.</p>`,
    button(signInUrl, "Sign in"),
    `<p style="margin:0;color:#6d7b6f;font-size:13px;line-height:1.5">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all;color:#3e4f40">${signInUrl}</span></p>`,
    rule(),
    small("If you didn't request this, you can ignore this email."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function onboardingConfirmTemplate({ doctorName, clinicName, city }: { doctorName: string; clinicName: string; city: string }) {
  const subject = `Almost done — confirming your match with ${doctorName}`;
  const textBody = [
    `Thanks for choosing RadMedicine.`,
    ``,
    `You've matched with ${doctorName} at ${clinicName} in ${city}, CO.`,
    `We'll send a welcome email the moment your membership is active.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("Thanks for choosing RadMedicine."),
    `<p style="margin:0 0 14px;line-height:1.55">You've matched with <strong>${doctorName}</strong> at ${clinicName} in ${city}, CO.</p>`,
    `<p style="margin:0 0 20px;line-height:1.55">We'll send a welcome email the moment your membership is active.</p>`,
    rule(),
    small("Questions? Reply to this email — we read every one."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function welcomeTemplate({ doctorName, clinicName, city }: { doctorName: string; clinicName: string; city: string }) {
  const subject = `Welcome to RadMedicine — your membership with ${doctorName}`;
  const textBody = [
    `You're in.`,
    ``,
    `Your RadMedicine membership with ${doctorName} (${clinicName}, ${city}, CO) is active.`,
    `${doctorName} will reach out within 24 hours to schedule your first visit.`,
    ``,
    `What to expect:`,
    `- Longer visits than you're used to (30–60 minutes).`,
    `- Text or call your doctor directly.`,
    `- Most basic care included in your monthly fee.`,
    ``,
    `If you have any questions before then, just reply to this email.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("You're in."),
    `<p style="margin:0 0 14px;line-height:1.55">Your membership with <strong>${doctorName}</strong> (${clinicName}, ${city}, CO) is active.</p>`,
    `<p style="margin:0 0 20px;line-height:1.55">${doctorName} will reach out within 24 hours to schedule your first visit.</p>`,
    `<p style="margin:0 0 8px;font-weight:500">What to expect</p>`,
    `<ul style="margin:0 0 20px;padding-left:20px;color:#3e4f40;line-height:1.6">`,
    `<li>Longer visits than you're used to (30–60 minutes).</li>`,
    `<li>Text or call your doctor directly.</li>`,
    `<li>Most basic care included in your monthly fee.</li>`,
    `</ul>`,
    rule(),
    small("Questions? Reply to this email."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function clinicNewPatientNotifyTemplate({ patientEmail, clinicName, doctorName }: { patientEmail: string; clinicName: string; doctorName: string }) {
  const subject = `New patient for ${doctorName} via RadMedicine`;
  const textBody = [
    `New patient match`,
    ``,
    `A new patient has subscribed to ${doctorName} at ${clinicName}.`,
    `Email: ${patientEmail}`,
    ``,
    `Please reach out within 24 hours to schedule their first visit.`,
    ``,
    `Per RadMedicine's privacy design, this is all the information we hold`,
    `on this patient — their ZIP, age range, and care needs never leave our`,
    `platform and aren't joined to their identity.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("New patient match"),
    `<p style="margin:0 0 14px;line-height:1.55">A new patient has subscribed to <strong>${doctorName}</strong> at ${clinicName}.</p>`,
    `<p style="margin:0 0 14px;line-height:1.55"><strong>Email:</strong> <a href="mailto:${patientEmail}" style="color:#5a8a6e">${patientEmail}</a></p>`,
    `<p style="margin:0 0 20px;line-height:1.55">Please reach out within 24 hours to schedule their first visit.</p>`,
    rule(),
    small("Per RadMedicine's privacy design, this is all the information we hold on this patient."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function paymentReceiptTemplate({ doctorName, amountCents, cardLast4 }: { doctorName: string; amountCents: number; cardLast4: string }) {
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  const subject = `Your RadMedicine receipt — ${amount}`;
  const textBody = [
    `Payment received`,
    ``,
    `${amount} — RadMedicine membership with ${doctorName}`,
    `Card ending in ${cardLast4}`,
    ``,
    `Manage billing anytime at your RadMedicine account.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("Payment received"),
    `<p style="margin:0 0 14px;line-height:1.55;font-size:20px;font-family:'Young Serif',Georgia,serif;color:#5a8a6e">${amount}</p>`,
    `<p style="margin:0 0 6px;line-height:1.55">RadMedicine membership with <strong>${doctorName}</strong></p>`,
    `<p style="margin:0 0 20px;line-height:1.55;color:#6d7b6f;font-size:13px">Card ending in ${cardLast4}</p>`,
    rule(),
    small("Manage billing anytime at your RadMedicine account."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function subscriptionCancelledTemplate({ doctorName }: { doctorName: string }) {
  const subject = `Your RadMedicine membership has ended`;
  const textBody = [
    `Membership ended`,
    ``,
    `Your RadMedicine membership with ${doctorName} has been cancelled.`,
    `No further charges will be made.`,
    ``,
    `If you'd like to come back, we'll be here.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("Membership ended"),
    `<p style="margin:0 0 14px;line-height:1.55">Your membership with <strong>${doctorName}</strong> has been cancelled. No further charges will be made.</p>`,
    `<p style="margin:0 0 20px;line-height:1.55">If you'd like to come back, we'll be here.</p>`,
    rule(),
    small("Questions? Reply to this email."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}

export function waitlistConfirmTemplate({ zip }: { zip: string }) {
  const subject = `You're on the RadMedicine waitlist`;
  const textBody = [
    `You're on the waitlist.`,
    ``,
    `RadMedicine launched in Colorado first. When we open to ${zip || "your ZIP"},`,
    `you'll be one of the first to know.`,
    ``,
    `— RadMedicine`,
  ].join("\n");
  const htmlBody = [
    SHELL_OPEN,
    h1("You're on the waitlist."),
    `<p style="margin:0 0 14px;line-height:1.55">RadMedicine launched in Colorado first. When we open to <strong>${zip || "your ZIP"}</strong>, you'll be one of the first to know.</p>`,
    rule(),
    small("Questions? Reply to this email."),
    SHELL_CLOSE,
  ].join("");
  return { subject, htmlBody, textBody };
}
