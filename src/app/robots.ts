import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yovigo.cn";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/auth/callback"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
