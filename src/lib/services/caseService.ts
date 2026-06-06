// ── Case Service ────────────────────────────────────────────────────────
// 所有病例相关的 API 请求集中在此。未来移植小程序只需改此文件。

import type { Case } from "@/lib/supabase";

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
  /** 获取案例列表（支持按分类和难度筛选） */
  async getCases(filters?: { category?: string; difficulty?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.difficulty) params.set("difficulty", filters.difficulty);
    const data = await request<{ cases: Case[] }>(`/api/cases?${params.toString()}`);
    return data.cases;
  },

  /** 获取单个案例详情 */
  async getCaseById(id: string) {
    const data = await request<{ case: Case }>(`/api/cases/${id}`);
    return data.case;
  },

  /** 创建新案例（管理员用） */
  async createCase(caseData: CaseInput) {
    const data = await request<{ case: Case }>("/api/cases", {
      method: "POST",
      body: JSON.stringify(caseData),
    });
    return data.case;
  },

  /** 更新案例 */
  async updateCase(id: string, data: Partial<CaseInput>) {
    await request<{ ok: boolean }>(`/api/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /** 删除案例 */
  async deleteCase(id: string) {
    await request<{ ok: boolean }>(`/api/cases/${id}`, { method: "DELETE" });
  },

  /** 发布/下架案例 */
  async togglePublish(id: string, published: boolean) {
    await request<{ ok: boolean }>(`/api/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify({ is_published: published }),
    });
  },

  /** 获取草稿列表（管理员用，返回未发布的案例） */
  async getDrafts() {
    const data = await request<{ cases: Case[] }>("/api/cases");
    return data.cases.filter((c) => !c.is_published);
  },
};
