// ── Case Service ────────────────────────────────────────────────────────
// 所有病例相关的 API 请求集中在此。

import type { Case } from "@/lib/supabase";
import { ROUTES } from "@/lib/routes";

export type CaseInput = Omit<Case, "id" | "created_at">;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "请求失败") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const caseService = {
  async getCases(filters?: { category?: string; difficulty?: string; mapping_system?: string }, learnerId?: string) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.difficulty) params.set("difficulty", filters.difficulty);
    if (filters?.mapping_system) params.set("mapping_system", filters.mapping_system);
    if (learnerId) params.set("learnerId", learnerId);
    const data = await request<{ cases: Case[]; learnerCounts?: Record<string, number>; learnedCount?: number; freeLimit?: number }>(`${ROUTES.API_CASES}?${params.toString()}`);
    return { cases: data.cases, learnerCounts: data.learnerCounts || {}, learnedCount: data.learnedCount || 0, freeLimit: data.freeLimit || 0 };
  },

  async getCaseById(id: string, anonymousId?: string) {
    const q = anonymousId ? `?learnerId=${encodeURIComponent(anonymousId)}` : "";
    const data = await request<{ case: Case }>(ROUTES.API_CASE(id) + q);
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
