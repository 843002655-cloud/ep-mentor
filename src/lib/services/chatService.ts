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
  contentJson?: Record<string, unknown>;
  currentFigure?: Record<string, unknown>;
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
      {
        caseContext: caseContext.contentJson
          ? { ...caseContext, ...caseContext.contentJson }
          : caseContext,
        messages,
        caseId,
        stream: false,
        currentFigure: caseContext.currentFigure,
      }
    );
    return { reply: data.reply, quota: data.quota };
  },

  /** 流式发送消息（stream: true）— Web 专用，含 30s 超时和一次重试 */
  async sendMessageStream(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    onChunk: (text: string) => void,
    retry = 0
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(ROUTES.API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseContext: caseContext.contentJson
            ? { ...caseContext, ...caseContext.contentJson }
            : caseContext,
          messages,
          caseId,
          stream: true,
          currentFigure: caseContext.currentFigure,
        }),
        signal: controller.signal,
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
    } catch (err: unknown) {
      const isAbort = (err as Error).name === "AbortError";
      const isNetwork = err instanceof TypeError;
      if ((isAbort || isNetwork) && retry < 1) {
        return this.sendMessageStream(messages, caseContext, caseId, onChunk, retry + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /** 切换教学图片时生成苏格拉底式开场（不消耗对话配额） */
  async sendFigureIntroStream(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    figureIndex: number,
    figureTotal: number,
    onChunk: (text: string) => void
  ): Promise<string> {
    const res = await fetch(ROUTES.API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseContext: caseContext.contentJson
          ? { ...caseContext, ...caseContext.contentJson }
          : caseContext,
        messages: messages.filter((m) => m.role !== "system"),
        caseId,
        stream: true,
        figureIntro: true,
        figureIndex,
        figureTotal,
        currentFigure: caseContext.currentFigure,
      }),
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
