// ── Submission Service ─────────────────────────────────────────────────
// 病例投稿 API 请求

import { ROUTES } from "@/lib/routes";

interface Submission {
  id: string; doctor_name: string; hospital: string;
  case_title: string; case_content: string; status: string; created_at: string;
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

export const submissionService = {
  async getSubmissions(status?: string) {
    const params = status ? `?status=${status}` : "";
    const data = await request<{ submissions: Submission[] }>(
      `${ROUTES.API_SUBMISSIONS}${params}`
    );
    return data.submissions;
  },

  async createSubmission(s: {
    doctor_name: string; hospital: string;
    case_title: string; case_content: string;
  }) {
    await request(ROUTES.API_SUBMISSIONS, {
      method: "POST", body: JSON.stringify(s),
    });
  },

  async reviewSubmission(id: string, status: "approved" | "rejected") {
    await request(ROUTES.API_SUBMISSION(id), {
      method: "PUT", body: JSON.stringify({ status }),
    });
  },
};
