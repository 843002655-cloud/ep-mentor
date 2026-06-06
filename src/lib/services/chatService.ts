// ── Chat Service ────────────────────────────────────────────────────────
// AI 导师对话和案例生成。

import { ROUTES } from "@/lib/routes";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CaseContext {
  title: string;
  category: string;
  difficulty: string;
  description: string;
  ecg_findings: string[];
  key_points: string[];
  question: string;
  hint: string;
}

export interface QuotaInfo {
  remaining: number;
  total: number;
}

async function request<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

export const chatService = {
  /** 非流式发送消息（stream: false）— 小程序 / 通用场景 */
  async sendMessage(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string
  ): Promise<{ reply: string; quota?: QuotaInfo }> {
    const data = await request<{ reply: string; quota?: QuotaInfo }>(
      ROUTES.API_CHAT,
      { caseContext, messages, caseId, stream: false }
    );
    return { reply: data.reply, quota: data.quota };
  },

  /** 流式发送消息（stream: true）— Web 专用 */
  async sendMessageStream(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const res = await fetch(ROUTES.API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseContext, messages, caseId, stream: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "请求失败" }));
      throw new Error(data.error || "请求失败");
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("流式响应不支持");
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }
    return fullText;
  },

  /** AI 生成案例（管理员用） */
  async generateCase(category: string, difficulty: string, count = 1) {
    const data = await request<{ cases: object[] }>(ROUTES.API_GENERATE_CASE, {
      category,
      difficulty,
      count,
    });
    return data.cases;
  },
};
