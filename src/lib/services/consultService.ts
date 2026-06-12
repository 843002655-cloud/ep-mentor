// ── AI Consult Service ────────────────────────────────────────────────
// 独立 AI 导师：支持图片的心电生理专家答疑
// 使用百炼 qwen-vl-max 模型

export interface ConsultMessage {
  role: "user" | "assistant";
  content: string;
  /** Base64 data URIs or HTTP URLs of images attached to this message */
  images?: string[];
}

export async function sendConsultMessage(
  messages: ConsultMessage[]
): Promise<string> {
  const apiMessages = messages.map((msg) => {
    if (msg.images && msg.images.length > 0) {
      // Vision format: send text + images as content array
      const parts = [];
      for (const img of msg.images) {
        parts.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
      parts.push({ type: "text", text: msg.content || "请分析这张图" });
      return { role: "user", content: parts };
    }
    return { role: msg.role, content: msg.content };
  });

  const res = await fetch("/api/consult", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: apiMessages }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data.reply;
}
