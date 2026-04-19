import "server-only";
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { authEdgeConfig } from "./auth.config";
import { db as coreDb } from "./db/core";
import * as coreSchema from "./db/schema/core";
import { sendEmail } from "./email/postmark";
import { magicLinkTemplate } from "./email/templates";

export { isAdminEmail } from "./auth.config";

/**
 * Full NextAuth config — Node runtime only (uses DrizzleAdapter +
 * postgres-js). Imported by the /api/auth/[...nextauth] route handler
 * and by server components that need to read the session.
 *
 * Middleware uses the edge-safe subset at `./auth.config.ts` instead.
 */

const emailProvider = {
  id: "email",
  type: "email" as const,
  name: "Email",
  from: process.env.POSTMARK_FROM_EMAIL ?? "hello@radmedicine.io",
  server: {},
  maxAge: 10 * 60,
  options: {},
  async sendVerificationRequest({
    identifier,
    url,
  }: {
    identifier: string;
    url: string;
  }) {
    const hostname = new URL(url).hostname;
    const { subject, htmlBody, textBody } = magicLinkTemplate({
      signInUrl: url,
      hostname,
    });
    const result = await sendEmail({
      to: identifier,
      subject,
      htmlBody,
      textBody,
      tag: "magic-link",
    });
    if (!result.ok) {
      throw new Error(`Failed to send magic link: ${result.error}`);
    }
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authEdgeConfig,
  adapter: DrizzleAdapter(coreDb, {
    usersTable: coreSchema.users,
    accountsTable: coreSchema.accounts,
    sessionsTable: coreSchema.sessions,
    verificationTokensTable: coreSchema.verificationTokens,
  }),
  providers: [emailProvider],
});
