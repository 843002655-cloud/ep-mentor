"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { sendConsultMessage, type ConsultMessage } from "@/lib/services/consultService";

const STORAGE_KEY = "ep_consult_history";

function loadHistory(): ConsultMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(msgs: ConsultMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch { /* quota exceeded, ignore */ }
}

export default function AIConsultPage() {
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    setMessages(loadHistory());
    setHydrated(true);
  }, []);

  // Save history on change
  useEffect(() => {
    if (hydrated && messages.length > 0) saveHistory(messages);
  }, [messages, hydrated]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Resize textarea
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

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const newImages: { dataUrl: string; name: string }[] = [];
    let loaded = 0;
    const total = files.length;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push({ dataUrl: reader.result as string, name: f.name });
        loaded++;
        if (loaded === total) {
          setImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(f);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
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
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const reply = await sendConsultMessage(updated);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，" + ((err as Error).message || "AI 暂不可用，请稍后重试"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (messages.length === 0) return;
    if (!confirm("确定清空所有对话记录？")) return;
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatFileSize = (dataUrl: string): string => {
    const base64 = dataUrl.split(",")[1] || "";
    const bytes = (base64.length * 3) / 4;
    if (bytes < 1024) return Math.round(bytes) + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

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
                {[
                  "AVNRT 和 AVRT 如何鉴别？",
                  "拖带标测的操作要点",
                  "心外膜 VT 的心电图特征",
                  "PFA 和射频消融对比",
                ].map((q) => (
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
            <div className="divide-y divide-[#F0F3F8] dark:divide-slate-800">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`px-4 sm:px-6 py-4 ${
                    msg.role === "assistant"
                      ? "bg-[#F9FBFD] dark:bg-slate-800/50"
                      : "bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                        msg.role === "assistant"
                          ? "bg-[#1B4F8A] dark:bg-blue-600 text-white"
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
                        <div className="text-sm text-[#1A2332] dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Streaming placeholder */}
              {sending && (
                <div className="px-4 sm:px-6 py-4 bg-[#F9FBFD] dark:bg-slate-800/50">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1B4F8A] dark:bg-blue-600 text-white flex items-center justify-center text-sm shrink-0">
                      AI
                    </div>
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
                {images.length > 0 ? `${images.length} 张图` : ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || (!input.trim() && images.length === 0)}
            className="shrink-0 px-5 py-3 rounded-xl bg-[#1B4F8A] dark:bg-blue-600 text-white font-medium text-sm hover:bg-[#154070] dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {sending ? "..." : "发送"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
