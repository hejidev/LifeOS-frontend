import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lifeos.com.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/admin/", "/super-admin/", "/merchant/", "/staff/", "/emergency/", "/family/", "/api/", "/login", "/reset-password"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}