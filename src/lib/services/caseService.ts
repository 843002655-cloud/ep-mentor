// ── Case Service ────────────────────────────────────────────────────────
// 所有病例相关的 API 请求集中在此。

import type { Case } from "@/lib/supabase";
import { ROUTES } from "@/lib/routes";

export type CaseInput = Omit<Case, "id" | "created_at">;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

export const caseService = {
  async getCases(filters?: { category?: string; difficulty?: string; mapping_system?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.difficulty) params.set("difficulty", filters.difficulty);
    if (filters?.mapping_system) params.set("mapping_system", filters.mapping_system);
    const data = await request<{ cases: Case[] }>(`${ROUTES.API_CASES}?${params.toString()}`);
    return data.cases;
  },

  async getCaseById(id: string) {
    const data = await request<{ case: Case }>(ROUTES.API_CASE(id));
    return data.case;
  },

  async createCase(caseData: CaseInput) {
    const data = await request<{ case: Case }>(ROUTES.API_CASES, {
      method: "POST",
      body: JSON.stringify(caseData),
    });
    return data.case;
  },

  async updateCase(id: string, data: Partial<CaseInput>) {
    await request<{ ok: boolean }>(ROUTES.API_CASE(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCase(id: string) {
    await request<{ ok: boolean }>(ROUTES.API_CASE(id), { method: "DELETE" });
  },

  async togglePublish(id: string, published: boolean) {
    await request<{ ok: boolean }>(ROUTES.API_CASE(id), {
      method: "PUT",
      body: JSON.stringify({ is_published: published }),
    });
  },

  async getDrafts() {
    const data = await request<{ cases: Case[] }>(ROUTES.API_CASES);
    return data.cases.filter((c) => !c.is_published);
  },
};
