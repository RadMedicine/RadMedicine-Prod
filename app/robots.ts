import type { MetadataRoute } from "next";
import { abs } from "@/src/lib/seo";

/**
 * robots.txt — allow the public marketing surface, block operator /
 * private routes, point at sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/clinic/dashboard", "/sign-in", "/api"],
      },
    ],
    sitemap: abs("/sitemap.xml"),
  };
}
