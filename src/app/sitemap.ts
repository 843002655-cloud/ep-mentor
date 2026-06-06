import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yovigo.cn";
  const routes = [
    { url: baseUrl, priority: 1, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/cases`, priority: 0.9, changeFrequency: "daily" as const },
    { url: `${baseUrl}/quiz`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/library`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/about`, priority: 0.5, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/auth`, priority: 0.3, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/upgrade`, priority: 0.3, changeFrequency: "monthly" as const },
  ];
  return routes.map((r) => ({
    url: r.url,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
