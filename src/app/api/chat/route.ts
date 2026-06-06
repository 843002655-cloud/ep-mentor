import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const SYSTEM_PROMPT = `你是一位顶级心脏电生理专家导师，拥有30年导管消融经验。教学风格：
1. 用苏格拉底式提问引导学员思考，不直接给出完整答案
2. 结合当前案例的具体细节进行教学
3. 指出常见临床误区和陷阱
4. 引用最新ACC/HRS/ESC指南（2023-2024）
5. 用中文回答，保留必要的英文专业术语（如AVNRT、delta wave等）
6. 每次回答不超过250字，结尾提出一个深入思考的问题
7. 当学员回答正确时，给予鼓励并引导到下一个知识点`;

export async function POST(request: NextRequest) {
  try {
    const {
      caseContext,
      messages,
      caseId,
      stream = false,
    } = await request.json();

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 }
      );
    }

    // Build case context string
    const contextStr = `
当前教学案例：
- 标题：${caseContext.title}
- 分类：${caseContext.category}
- 难度：${caseContext.difficulty}
- 病史：${caseContext.description}
- 心电图发现：${(caseContext.ecg_findings || []).join("；")}
- 核心问题：${caseContext.question}
- 教学提示：${caseContext.hint}
- 关键知识点：${(caseContext.key_points || []).join("、")}`;

    // ── Auth & Quota ──────────────────────────────────────────────
    let userId: string | null = null;
    const cookieHeader = request.headers.get("cookie") || "";
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader
              .split("; ")
              .map((c) => {
                const [name, ...rest] = c.split("=");
                return { name, value: rest.join("=") };
              });
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

    if (userId) {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", today);

      if (count && count >= 20) {
        return NextResponse.json(
          { error: "今日对话次数已达上限（20次），请明天再来" },
          { status: 429 }
        );
      }
    }

    const conversationMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })
    );

    // ── Non-streaming mode (小程序 / 通用) ─────────────────────────
    if (!stream) {
      const response = await deepseek.chat.completions.create({
        model: MODEL,
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextStr },
          ...conversationMessages,
        ],
      });

      const reply =
        response.choices[0]?.message?.content || "";

      // Increment quota
      if (userId) {
        await recordUsage(cookieHeader, userId, caseId);
      }

      return NextResponse.json({ reply });
    }

    // ── Streaming mode (SSE, Web 专用) ────────────────────────────
    const streamResponse = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextStr },
        ...conversationMessages,
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          // Record quota after streaming completes
          if (userId) {
            await recordUsage(cookieHeader, userId, caseId);
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err.message || "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}

/** 记录用户对话配额 */
async function recordUsage(
  cookieHeader: string,
  userId: string,
  caseId: string
) {
  try {
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader
              .split("; ")
              .map((c) => {
                const [name, ...rest] = c.split("=");
                return { name, value: rest.join("=") };
              });
          },
          setAll() {},
        },
      }
    );
    await supabaseAdmin.from("user_progress").insert({
      user_id: userId,
      case_id: caseId,
      completed_at: new Date().toISOString(),
      score: 0,
    });
  } catch {
    // quota recording failure shouldn't break the chat
  }
}
