import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const FREE_LIMIT = 20;
const ANON_LIMIT = 3;

const SYSTEM_PROMPT = `你是一位顶级心脏电生理专家导师，拥有30年导管消融经验。教学风格：
1. 用苏格拉底式提问引导学员思考，不直接给出完整答案
2. 结合当前案例的具体细节进行教学
3. 指出常见临床误区和陷阱
4. 引用最新ACC/HRS/ESC指南（2023-2024）
5. 用中文回答，保留必要的英文专业术语（如AVNRT、delta wave等）
6. 每次回答不超过250字，结尾提出一个深入思考的问题
7. 当学员回答正确时，给予鼓励并引导到下一个知识点`;

// ── Helper: 获取服务端 Supabase 客户端 ─────────────────────────────

function getSupabase(cookieHeader: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split("; ").map((c) => {
            const [name, ...rest] = c.split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {},
      },
    }
  );
}

function getSupabaseAdmin(cookieHeader: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split("; ").map((c) => {
            const [name, ...rest] = c.split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {},
      },
    }
  );
}

// ── Quota: 查询或初始化今日用量 ─────────────────────────────────────

async function checkAndIncrementQuota(
  userId: string | null,
  ip: string,
  cookieHeader: string
): Promise<{ allowed: boolean; remaining: number; total: number }> {
  const supabaseAdmin = getSupabaseAdmin(cookieHeader);
  const today = new Date().toISOString().split("T")[0];
  const limit = userId ? FREE_LIMIT : ANON_LIMIT;

  // 查询今日记录
  const { data: existing } = await supabaseAdmin
    .from("usage_logs")
    .select("chat_count")
    .eq(userId ? "user_id" : "ip_address", userId || ip)
    .eq("date", today)
    .maybeSingle();

  const current = existing?.chat_count || 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, total: limit };
  }

  // Upsert：计数 +1
  const newCount = current + 1;
  const upsertData: Record<string, unknown> = {
    date: today,
    chat_count: newCount,
  };
  if (userId) {
    upsertData.user_id = userId;
  } else {
    upsertData.ip_address = ip;
  }

  const { error } = await supabaseAdmin.from("usage_logs").upsert(upsertData, {
    onConflict: userId ? "user_id,date" : "ip_address,date",
  });

  if (error) console.error("Quota upsert error:", error);

  return { allowed: true, remaining: limit - newCount, total: limit };
}

// ── API ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { caseContext, messages, caseId, stream = false } =
      await request.json();

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 }
      );
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 获取用户
    const supabase = getSupabase(cookieHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // 检查每日配额
    const quota = await checkAndIncrementQuota(userId, ip, cookieHeader);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `今日对话次数已达上限（${quota.total}次），请明天再来`,
          quota,
        },
        { status: 429 }
      );
    }

    // Build case context
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

    const conversationMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })
    );

    // ── Non-streaming mode ──────────────────────────────────────────
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
      const reply = response.choices[0]?.message?.content || "";

      // Record user_progress (for dashboard stats)
      if (userId) {
        const supabaseAdmin = getSupabaseAdmin(cookieHeader);
        await supabaseAdmin.from("user_progress").insert({
          user_id: userId,
          case_id: caseId,
          completed_at: new Date().toISOString(),
          score: 0,
        }).select().maybeSingle();
      }

      return NextResponse.json({ reply, quota });
    }

    // ── Streaming mode ──────────────────────────────────────────────
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
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          if (userId) {
            const supabaseAdmin = getSupabaseAdmin(cookieHeader);
            await supabaseAdmin.from("user_progress").insert({
              user_id: userId,
              case_id: caseId,
              completed_at: new Date().toISOString(),
              score: 0,
            }).select().maybeSingle();
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
