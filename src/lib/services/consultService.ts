// ── AI Consult Service ──────────────────────────────────────────────────
// 独立 AI 导师：支持图片的心电生理专家答疑
// 使用百炼 qwen-vl-max 模型

export interface ConsultMessage {
  role: "user" | "assistant";
  content: string;
  /** Compressed Base64 data URIs of images attached to this message */
  images?: string[];
  /** True when this is an error placeholder the user can retry */
  error?: boolean;
}

// ── Image Compression ───────────────────────────────────────────────────
// Client-side canvas resize + JPEG compress. ECG images from phones can be
// 4K+ resolution and 5MB+. We resize to max 2048px and compress to JPEG Q70,
// reducing them to ~80-150KB — safe for IndexedDB and API transfer.

export async function compressImage(
  file: File,
  maxPx = 2048,
  quality = 0.7
): Promise<{ dataUrl: string; name: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxPx || h > maxPx) {
        const ratio = Math.min(maxPx / w, maxPx / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", quality),
        name: file.name.replace(/\.(png|gif|webp|bmp)$/i, ".jpg"),
      });
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

// ── Non-streaming Send (fallback) ────────────────────────────────────────

export async function sendConsultMessage(
  messages: ConsultMessage[],
  signal?: AbortSignal
): Promise<string> {
  const apiMessages = buildApiMessages(messages);

  const res = await fetch("/api/consult", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: apiMessages, stream: false }),
    signal,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败，请重试");
  return data.reply;
}

// ── Streaming Send ───────────────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

export function sendConsultMessageStream(
  messages: ConsultMessage[],
  callbacks: StreamCallbacks
): { abort: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const apiMessages = buildApiMessages(messages);

  (async () => {
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "服务暂时不可用";
        try {
          const errData = await res.json();
          msg = errData.error || msg;
        } catch { /* use default */ }
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式响应");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        callbacks.onChunk(chunk);
      }

      callbacks.onDone(fullText);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        const abortedErr = new Error("已中止");
        (abortedErr as Error & { aborted: boolean }).aborted = true;
        callbacks.onError(abortedErr);
      } else {
        callbacks.onError(err as Error);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  return {
    abort: () => {
      controller.abort();
      clearTimeout(timeoutId);
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildApiMessages(messages: ConsultMessage[]) {
  return messages.map((msg) => {
    if (msg.images && msg.images.length > 0) {
      const parts: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [];
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
}
