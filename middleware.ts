import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authEdgeConfig, isAdminEmail } from "@/src/lib/auth.config";

/**
 * Middleware — gates /admin and /clinic/dashboard. Runs in the edge
 * runtime; imports only the edge-safe auth config (no DrizzleAdapter,
 * no postgres-js). Session is read from the JWT cookie.
 *
 *   /admin/*           — requires signed-in user with email in ADMIN_EMAILS
 *   /clinic/dashboard* — requires signed-in user (clinic-ownership check
 *                        happens server-side inside the layout, against
 *                        core.clinic_users — middleware only enforces
 *                        "has a session")
 */
const { auth } = NextAuth(authEdgeConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const email = session?.user?.email ?? null;

  if (!session?.user) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("from", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  if (nextUrl.pathname.startsWith("/admin") && !isAdminEmail(email)) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("denied", "admin");
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/clinic/dashboard/:path*"],
};
