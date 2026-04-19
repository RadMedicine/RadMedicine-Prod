import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config. Imported by both `src/lib/auth.ts` (full,
 * Node runtime, includes DrizzleAdapter + providers) and `middleware.ts`
 * (edge runtime, no DB). Keep this file free of anything that isn't
 * edge-compatible — no postgres-js, no DrizzleAdapter, no Node-only
 * crypto, etc. See Auth.js v5 "split config" pattern.
 */
export const authEdgeConfig: NextAuthConfig = {
  // Providers are added in the full config (auth.ts). Middleware only
  // needs the session shape.
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check",
    error: "/sign-in",
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

/**
 * Email allowlist for /admin. Comma-separated env var, case-insensitive.
 * Shared helper — safe in both edge and node runtimes.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
