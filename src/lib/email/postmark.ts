import "server-only";

/**
 * Postmark client — stubbed for Beta.
 *
 * When POSTMARK_API_KEY is set, sendEmail posts to Postmark's /email API.
 * When it's missing (local dev before Jon provisions the account),
 * sendEmail logs the email to stdout and returns a synthetic success.
 *
 * The call sites (NextAuth magic-link, transactional templates) don't
 * care which path ran — they just await sendEmail. When the key is
 * added to .env.local, dispatch turns on with no code changes.
 *
 * NOTE: this is the ONLY module that should touch Postmark's API.
 * Feature code calls the domain-specific helpers (sendMagicLink,
 * sendOnboardingConfirm, etc.) — not sendEmail directly.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  /** Override the configured from-address for this message only. */
  from?: string;
  /** Postmark message stream; defaults to env POSTMARK_MESSAGE_STREAM. */
  messageStream?: string;
  /** Free-form context surfaced in logs / the audit trail. */
  tag?: string;
};

export type SendEmailResult =
  | { ok: true; id: string; dispatched: boolean }
  | { ok: false; error: string };

const POSTMARK_ENDPOINT = "https://api.postmarkapp.com/email";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.POSTMARK_API_KEY;
  const from = input.from ?? process.env.POSTMARK_FROM_EMAIL ?? "hello@radmedicine.io";
  const stream = input.messageStream ?? process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

  if (!apiKey) {
    // Stub path — no dispatch. Log metadata, then the full text body
    // so the dev can grab magic-link URLs, waitlist confirmations,
    // etc. straight out of the terminal.
    // eslint-disable-next-line no-console
    console.info(
      `[email STUB] to=${input.to} subject="${input.subject}" tag=${input.tag ?? "-"} stream=${stream} (POSTMARK_API_KEY missing — not dispatched)`,
    );
    // eslint-disable-next-line no-console
    console.info(`[email STUB] --- text body ---\n${input.textBody}\n[email STUB] --- end ---`);
    return { ok: true, id: `stub-${Date.now()}`, dispatched: false };
  }

  try {
    const res = await fetch(POSTMARK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": apiKey,
      },
      body: JSON.stringify({
        From: from,
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.htmlBody,
        TextBody: input.textBody,
        MessageStream: stream,
        Tag: input.tag,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `postmark ${res.status}: ${text.slice(0, 200)}` };
    }

    const body = (await res.json()) as { MessageID?: string };
    return { ok: true, id: body.MessageID ?? "unknown", dispatched: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
