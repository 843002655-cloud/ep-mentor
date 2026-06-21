// ── Chat Service ────────────────────────────────────────────────────────
// AI 导师对话和案例生成。

import { ROUTES } from "@/lib/routes";
import {
  parseStreamMeta,
  type ChatReplyMeta,
  type TeachingState,
} from "@/lib/teaching-state";

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

export interface ChatStreamResult {
  text: string;
  meta?: ChatReplyMeta;
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

function buildPayload(
  messages: Message[],
  caseContext: CaseContext,
  caseId: string,
  extra?: Record<string, unknown>
) {
  return {
    caseContext: caseContext.contentJson
      ? { ...caseContext, ...caseContext.contentJson }
      : caseContext,
    messages,
    caseId,
    currentFigure: caseContext.currentFigure,
    ...extra,
  };
}

async function readStreamWithMeta(
  res: Response,
  onChunk: (text: string) => void
): Promise<ChatStreamResult> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("流式响应不支持");

  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    const visible = parseStreamMeta(fullText).text;
    onChunk(visible);
  }

  return parseStreamMeta(fullText);
}

export const chatService = {
  /** 非流式发送消息 — 小程序 / 通用场景 */
  async sendMessage(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    teachingState?: TeachingState
  ): Promise<{ reply: string; quota?: QuotaInfo; meta?: ChatReplyMeta }> {
    const data = await request<{
      reply: string;
      quota?: QuotaInfo;
      status?: string;
      hint?: string;
      teachingState?: TeachingState;
    }>(ROUTES.API_CHAT, buildPayload(messages, caseContext, caseId, {
      stream: false,
      teachingState,
      figureIndex: teachingState?.figureIndex ?? 0,
    }));

    return {
      reply: data.reply,
      quota: data.quota,
      meta: {
        status: (data.status as ChatReplyMeta["status"]) || "questioning",
        hint: data.hint,
        teachingState: data.teachingState,
      },
    };
  },

  /** 流式发送消息 — Web 专用 */
  async sendMessageStream(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    onChunk: (text: string) => void,
    teachingState?: TeachingState,
    retry = 0
  ): Promise<ChatStreamResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(ROUTES.API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPayload(messages, caseContext, caseId, {
            stream: true,
            teachingState,
            figureIndex: teachingState?.figureIndex ?? 0,
          })
        ),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(data.error || "请求失败");
      }
      return await readStreamWithMeta(res, onChunk);
    } catch (err: unknown) {
      const isAbort = (err as Error).name === "AbortError";
      const isNetwork = err instanceof TypeError;
      if ((isAbort || isNetwork) && retry < 1) {
        return this.sendMessageStream(
          messages,
          caseContext,
          caseId,
          onChunk,
          teachingState,
          retry + 1
        );
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
    onChunk: (text: string) => void,
    teachingState?: TeachingState
  ): Promise<ChatStreamResult> {
    const res = await fetch(ROUTES.API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildPayload(messages.filter((m) => m.role !== "system"), caseContext, caseId, {
          stream: true,
          figureIntro: true,
          figureIndex,
          figureTotal,
          teachingState: { ...teachingState, figureIndex },
        })
      ),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "请求失败" }));
      throw new Error(data.error || "请求失败");
    }
    return readStreamWithMeta(res, onChunk);
  },

  /** 提交 AI 回复反馈 */
  async submitFeedback(input: {
    caseId: string;
    messageIndex: number;
    feedback: "up" | "down";
    figureIndex?: number;
    epStep?: number;
  }) {
    const res = await fetch(ROUTES.API_CHAT_FEEDBACK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("反馈提交失败");
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
