// ── Progress Service ────────────────────────────────────────────────────
// 用户学习进度和配额管理。

import { ROUTES } from "@/lib/routes";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

export interface ProgressItem {
  case_id: string;
  completed_at: string;
  cases: { title: string; category: string } | null;
}

export const progressService = {
  /** 获取用户学习进度 */
  async getUserProgress() {
    const data = await request<{
      progress: ProgressItem[];
      totalCases: number;
    }>(ROUTES.API_PROGRESS);
    return data;
  },

  /** 记录案例完成 */
  // markCompleted: Progress 由 chat API 自动记录，此方法预留未来扩展。

  /** 检查某案例是否已完成 */
  isCompleted(
    progress: ProgressItem[],
    caseId: string
  ): boolean {
    return progress.some((p) => p.case_id === caseId);
  },

  /** 获取今日对话次数 */
  getTodayUsage(progress: ProgressItem[]): number {
    const today = new Date().toISOString().split("T")[0];
    return progress.filter((p) => p.completed_at?.startsWith(today)).length;
  },

  /** 获取学习统计 */
  getStats(progress: ProgressItem[], totalCases: number) {
    const uniqueCases = new Set(progress.map((p) => p.case_id));
    return {
      completedCount: uniqueCases.size,
      totalCases,
      todayCount: this.getTodayUsage(progress),
      completionRate:
        totalCases > 0
          ? Math.round((uniqueCases.size / totalCases) * 100)
          : 0,
    };
  },
};
