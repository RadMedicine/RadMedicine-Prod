import "server-only";

/**
 * Templates — plain HTML + text bodies rendered in TS. No MJML / external
 * engine for Beta; the templates are small and the brand voice lives in
 * copy, not heavy layout.
 *
 * Voice per marketing/positioning-brief.md §5:
 *   - short, plain, concrete nouns
 *   - no exclamation points
 *   - italic accents carry verbs, not decoration
 *   - we never characterize insurance as an adversary
 */

type MagicLinkArgs = { signInUrl: string; hostname: string };

export function magicLinkTemplate({ signInUrl, hostname }: MagicLinkArgs) {
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
    `— RadMedicine`,
    `(${hostname})`,
  ].join("\n");
  const htmlBody = `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2c3e2e;background:#faf7f2;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e6e0d2;border-radius:14px;padding:32px">
    <h1 style="font-family:'Young Serif',Georgia,serif;font-size:28px;letter-spacing:-0.015em;margin:0 0 16px;color:#2c3e2e">
      Sign in to RadMedicine
    </h1>
    <p style="margin:0 0 20px;line-height:1.55">
      Click the button below to finish signing in.
      The link is good for the next 10 minutes.
    </p>
    <p style="margin:0 0 24px">
      <a href="${signInUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#5a8a6e;color:#faf7f2;text-decoration:none;font-weight:500">
        Sign in
      </a>
    </p>
    <p style="margin:0;color:#6d7b6f;font-size:13px;line-height:1.5">
      If the button doesn't work, paste this URL into your browser:<br>
      <span style="word-break:break-all;color:#3e4f40">${signInUrl}</span>
    </p>
    <hr style="margin:28px 0;border:0;height:1px;background:#e6e0d2" />
    <p style="margin:0;color:#a2ad9f;font-size:12px">
      If you didn't request this, you can ignore this email.
    </p>
  </div>
</body></html>`.trim();
  return { subject, htmlBody, textBody };
}
