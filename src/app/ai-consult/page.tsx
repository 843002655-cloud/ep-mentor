"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppLayout from "@/components/AppLayout";
import {
  sendConsultMessageStream,
  compressImage,
  type ConsultMessage,
} from "@/lib/services/consultService";
import { consultStore } from "@/lib/services/consultStorage";

// ── Quick questions ──────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  "AVNRT 和 AVRT 如何鉴别？",
  "拖带标测的操作要点",
  "心外膜 VT 的心电图特征",
  "PFA 和射频消融对比",
];

// ── Inline components ────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce"
        style={{ animationDelay: "0.3s" }}
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-0.5 rounded-md border border-[#DDE5EE] dark:border-slate-600 text-[#8FA0B4] dark:text-slate-500 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors shrink-0"
      title="复制回复"
    >
      {copied ? "✓ 已复制" : "📋 复制"}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function AIConsultPage() {
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamingForRef = useRef(-1);
  const streamingTextRef = useRef("");

  // ── Hydration ────────────────────────────────────────────────────────
  useEffect(() => {
    consultStore.getMessages().then(setMessages);
    setHydrated(true);
  }, []);

  // ── Persist to IndexedDB (debounced) ─────────────────────────────────
  const persistRef = useRef(0);
  useEffect(() => {
    if (!hydrated || sending) return;
    const now = Date.now();
    if (now - persistRef.current < 800) return;
    persistRef.current = now;
    // Full rewrite for simplicity
    consultStore.clear().then(() => {
      for (const m of messages) {
        consultStore.addMessage(m).catch(() => {});
      }
    });
  }, [messages, hydrated, sending]);

  // ── Auto-scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── Textarea auto-resize ─────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // ── Shared stream handler ────────────────────────────────────────────
  const finishStream = useCallback(() => {
    setSending(false);
    setStreamingText("");
    streamingForRef.current = -1;
    abortRef.current = null;
  }, []);

  const startStream = useCallback(
    (msgs: ConsultMessage[], insertAt: number) => {
      setSending(true);
      setStreamingText("");
      streamingTextRef.current = "";
      streamingForRef.current = insertAt;

      const { abort } = sendConsultMessageStream(msgs, {
        onChunk(text) {
          setStreamingText((prev) => {
            const next = prev + text;
            streamingTextRef.current = next;
            return next;
          });
        },
        onDone(fullText) {
          const aiMsg: ConsultMessage = { role: "assistant", content: fullText };
          setMessages((prev) => {
            const next = [...prev];
            if (streamingForRef.current >= next.length) {
              next.push(aiMsg);
            }
            return next;
          });
          finishStream();
          consultStore.addMessage(aiMsg).catch(() => {});
        },
        onError(err) {
          if ((err as Error & { aborted?: boolean }).aborted) {
            const partial = streamingTextRef.current;
            if (partial) {
              const aiMsg: ConsultMessage = { role: "assistant", content: partial };
              setMessages((prev) => [...prev, aiMsg]);
              consultStore.addMessage(aiMsg).catch(() => {});
            }
          } else {
            const errMsg: ConsultMessage = {
              role: "assistant",
              content: "抱歉，" + err.message,
              error: true,
            };
            setMessages((prev) => [...prev, errMsg]);
            consultStore.addMessage(errMsg).catch(() => {});
          }
          finishStream();
        },
      });

      abortRef.current = abort;
    },
    [finishStream]
  );

  // ── Image handling with compression ──────────────────────────────────
  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    const compressed = await Promise.all(
      validFiles.map((f) =>
        compressImage(f).catch(() => null)
      )
    );
    const newImages = compressed.filter(Boolean) as {
      dataUrl: string;
      name: string;
    }[];
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  }, []);

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Send ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const hasText = input.trim().length > 0;
    const hasImages = images.length > 0;
    if (!hasText && !hasImages) return;
    if (sending) return;

    const userMsg: ConsultMessage = {
      role: "user",
      content: input.trim(),
      images: images.map((img) => img.dataUrl),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setImages([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    consultStore.addMessage(userMsg).catch(() => {});
    startStream(updated, updated.length);
  }, [input, images, sending, messages, startStream]);

  const handleStop = () => {
    abortRef.current?.();
    abortRef.current = null;
  };

  // ── Retry (error message) ────────────────────────────────────────────
  const handleRetry = useCallback(
    (errorIndex: number) => {
      const cleaned = messages.filter((_, i) => i !== errorIndex);
      setMessages(cleaned);
      consultStore.clear().then(() => {
        for (const m of cleaned) consultStore.addMessage(m).catch(() => {});
      });

      startStream(cleaned, cleaned.length);
    },
    [messages, startStream]
  );

  // ── Regenerate (last AI message) ─────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const withoutLast = messages.slice(0, -1);
    setMessages(withoutLast);
    consultStore.clear().then(() => {
      for (const m of withoutLast) consultStore.addMessage(m).catch(() => {});
    });
    startStream(withoutLast, withoutLast.length);
  }, [messages, startStream]);

  // ── Keyboard ──────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Clear ─────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (messages.length === 0) return;
    if (!confirm("确定清空所有对话记录？")) return;
    setMessages([]);
    consultStore.clear().catch(() => {});
  };

  // ── Image size helper ─────────────────────────────────────────────────
  const formatFileSize = (dataUrl: string): string => {
    const base64 = dataUrl.split(",")[1] || "";
    const bytes = (base64.length * 3) / 4;
    if (bytes < 1024) return Math.round(bytes) + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  // ── Skeleton (SSR / not hydrated) ─────────────────────────────────────
  if (!hydrated) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">
              ⚡ AI 电生理顾问
            </h1>
            <p className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">
              上传心电图/腔内图，由百炼视觉模型分析解答
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#C5D3E0] dark:border-slate-600 text-[#8FA0B4] dark:text-slate-400 hover:text-[#9B2C2C] dark:hover:text-red-400 hover:border-[#9B2C2C] dark:hover:border-red-400 transition-colors"
            >
              清空对话
            </button>
          )}
        </div>

        {/* Chat area */}
        <div className="bg-white dark:bg-slate-900 border border-[#DDE5EE] dark:border-slate-700 rounded-xl mb-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Empty state ─────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2">
                EP 专家在线答疑
              </h3>
              <p className="text-sm text-[#8FA0B4] dark:text-slate-500 max-w-md">
                可以问我电生理机制、鉴别诊断、消融策略、指南解读...
                <br />
                也可以上传心电图或腔内图让我帮你分析
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 text-[#4B6080] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message list ────────────────────────────────── */
            <div className="divide-y divide-[#F0F3F8] dark:divide-slate-800">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`px-4 sm:px-6 py-4 ${
                    msg.role === "assistant"
                      ? msg.error
                        ? "bg-red-50/50 dark:bg-red-900/10"
                        : "bg-[#F9FBFD] dark:bg-slate-800/50"
                      : "bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                        msg.role === "assistant"
                          ? msg.error
                            ? "bg-[#9B2C2C] dark:bg-red-600 text-white"
                            : "bg-[#1B4F8A] dark:bg-blue-600 text-white"
                          : "bg-[#0F6E56] dark:bg-emerald-600 text-white"
                      }`}
                    >
                      {msg.role === "assistant" ? "AI" : "你"}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Images in user message */}
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.images.map((img, j) => (
                            <a
                              key={j}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={img}
                                alt={`上传图片 ${j + 1}`}
                                className="max-w-[200px] max-h-[200px] rounded-lg border border-[#DDE5EE] dark:border-slate-600 object-contain cursor-zoom-in hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.content && (
                        <div className="text-sm text-[#1A2332] dark:text-slate-200 leading-relaxed">
                          {msg.role === "assistant" && !msg.error ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-[#1A2332] dark:prose-headings:text-slate-100 prose-a:text-[#1B4F8A] dark:prose-a:text-blue-400 prose-code:text-[#1B4F8A] dark:prose-code:text-blue-300 prose-code:bg-[#F0F3F8] dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-strong:text-[#1A2332] dark:prose-strong:text-slate-100">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Copy + Regenerate (AI messages only, not error) */}
                      {msg.role === "assistant" && !msg.error && msg.content && (
                        <div className="flex items-center gap-2 mt-2">
                          <CopyButton text={msg.content} />
                          {i === messages.length - 1 && !sending && (
                            <button
                              onClick={handleRegenerate}
                              className="text-xs px-2 py-0.5 rounded-md border border-[#DDE5EE] dark:border-slate-600 text-[#8FA0B4] dark:text-slate-500 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors"
                              title="重新生成"
                            >
                              🔄 重新生成
                            </button>
                          )}
                        </div>
                      )}

                      {/* Retry button on error messages */}
                      {msg.error && (
                        <button
                          onClick={() => handleRetry(i)}
                          className="mt-2 text-xs px-3 py-1 rounded-lg bg-[#1B4F8A] dark:bg-blue-600 text-white hover:bg-[#154070] dark:hover:bg-blue-500 transition-colors"
                        >
                          🔄 重试
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {sending && (
                <div className="px-4 sm:px-6 py-4 bg-[#F9FBFD] dark:bg-slate-800/50">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1B4F8A] dark:bg-blue-600 text-white flex items-center justify-center text-sm shrink-0">
                      AI
                    </div>
                    <div className="flex-1 min-w-0">
                      {streamingText ? (
                        <div className="text-sm text-[#1A2332] dark:text-slate-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-[#1A2332] dark:prose-headings:text-slate-100 prose-a:text-[#1B4F8A] dark:prose-a:text-blue-400 prose-code:text-[#1B4F8A] dark:prose-code:text-blue-300 prose-code:bg-[#F0F3F8] dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-strong:text-[#1A2332] dark:prose-strong:text-slate-100">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingText}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <LoadingDots />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Image preview strip */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative group w-16 h-16 rounded-lg border border-[#DDE5EE] dark:border-slate-600 overflow-hidden shrink-0"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#9B2C2C] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 truncate">
                  {formatFileSize(img.dataUrl)}
                </div>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-[#C5D3E0] dark:border-slate-600 flex items-center justify-center text-[#8FA0B4] dark:text-slate-500 hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors text-xl shrink-0"
            >
              +
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 bg-white dark:bg-slate-900 border border-[#DDE5EE] dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-[#1B4F8A] dark:focus-within:border-blue-400 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                images.length > 0
                  ? "描述图片内容或提出你的问题..."
                  : "输入你的电生理问题... (Enter 发送, Shift+Enter 换行)"
              }
              rows={1}
              className="w-full px-4 py-3 text-sm text-[#1A2332] dark:text-slate-100 bg-transparent resize-none outline-none placeholder:text-[#A0B4C8] dark:placeholder:text-slate-500"
              disabled={sending}
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageSelect(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2 py-1 rounded-md text-[#8FA0B4] dark:text-slate-500 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
                  title="上传图片"
                >
                  🖼️ 上传图片
                </button>
              </div>
              <span className="text-[10px] text-[#A0B4C8] dark:text-slate-600 pr-1">
                {sending
                  ? streamingText
                    ? "接收中..."
                    : "思考中..."
                  : images.length > 0
                  ? `${images.length} 张图`
                  : ""}
              </span>
            </div>
          </div>

          {/* Send / Stop button */}
          {sending ? (
            <button
              onClick={handleStop}
              className="shrink-0 px-5 py-3 rounded-xl bg-[#9B2C2C] dark:bg-red-600 text-white font-medium text-sm hover:bg-[#7F2424] dark:hover:bg-red-500 transition-all"
            >
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && images.length === 0}
              className="shrink-0 px-5 py-3 rounded-xl bg-[#1B4F8A] dark:bg-blue-600 text-white font-medium text-sm hover:bg-[#154070] dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
