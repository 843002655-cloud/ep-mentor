// ── Resource Service ───────────────────────────────────────────────────
// 资料库 API 请求

import { ROUTES } from "@/lib/routes";

interface Resource {
  id: string; title: string; category: string;
  source: string; url: string; summary: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

export const resourceService = {
  async getResources(category?: string) {
    const params = category ? `?category=${category}` : "";
    const data = await request<{ resources: Resource[] }>(
      `${ROUTES.API_RESOURCES}${params}`
    );
    return data.resources;
  },

  async createResource(r: Omit<Resource, "id">) {
    await request(ROUTES.API_RESOURCES, {
      method: "POST", body: JSON.stringify(r),
    });
  },

  async updateResource(id: string, r: Partial<Omit<Resource, "id">>) {
    await request(ROUTES.API_RESOURCE(id), {
      method: "PUT", body: JSON.stringify(r),
    });
  },

  async deleteResource(id: string) {
    await request(ROUTES.API_RESOURCE(id), { method: "DELETE" });
  },
};
