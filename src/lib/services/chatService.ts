// ── Chat Service ────────────────────────────────────────────────────────
// AI 导师对话和案例生成。

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
  /** 发送消息给 AI 导师（非流式，PC + 小程序通用） */
  async sendMessage(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string
  ) {
    const data = await request<{ reply: string }>("/api/chat", {
      caseContext,
      messages,
      caseId,
    });
    return data.reply;
  },

  /** 流式发送（Web 专用，小程序不支持） */
  async sendMessageStream(
    messages: Message[],
    caseContext: CaseContext,
    caseId: string,
    onChunk: (text: string) => void
  ) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseContext, messages, caseId, stream: true }),
    });
    if (!res.ok) {
      const data = await res.json();
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
  async generateCase(
    category: string,
    difficulty: string,
    count: number = 1
  ) {
    const data = await request<{ cases: object[] }>("/api/generate-case", {
      category,
      difficulty,
      count,
    });
    return data.cases;
  },
};
