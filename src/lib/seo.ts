/**
 * SEO helpers shared across pages.
 *
 * Site URL resolves from NEXT_PUBLIC_SITE_URL (e.g. "https://radmedicine.io").
 * Falls back to a localhost URL so sitemap.ts / robots.ts don't throw
 * during local builds before the env is set.
 */

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  return raw.replace(/\/$/, "");
}

export function abs(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p}`;
}
