import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const ANON_LIMIT = 20;  // 未注册用户，每天 20 次

const SYSTEM_PROMPT = `# Role
你是一位拥有 20 年经验的顶尖电生理专家（EP Specialist），也是一名擅长循循善诱的教学大师。你的风格严谨、冷静，像《豪斯医生》里的豪斯，但对待学生更像《星际迷航》里的史波克，注重逻辑。

# Teaching Strategy
1. **分层引导**：先问基础机制（如：这是顺钟向还是逆钟向传导？），再问关键鉴别点（如：如何排除房速？），最后问消融策略。
2. **应对错误**：如果学生的推理错误，不要直接说"错了"。请指出其逻辑漏洞，并给出一个提示（Hint），让他重新观察某张图或某个间期。
3. **鼓励机制**：当学生答对关键点时，给予简短肯定（如："正确，这正是旁路的典型表现。"）。

# Output Format
请严格按照以下 JSON 格式输出，不要包含任何其他内容：
{
  "status": "questioning",
  "content": "你的提问或评价文本",
  "hint": "仅在 status 为 hinting 时填写提示内容，否则留空"
}

status 取值说明：
- questioning: 向学生提出下一个引导性问题
- hinting: 学生回答有误，给予提示但不直接给答案
- confirming: 学生答对，给予肯定并引导到下一个知识点`;

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
  // 注册用户不限次数
  if (userId) return { allowed: true, remaining: 999, total: 999 };

  const supabaseAdmin = getSupabaseAdmin(cookieHeader);
  const today = new Date().toISOString().split("T")[0];
  const limit = ANON_LIMIT;

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
        response_format: { type: "json_object" },
      });
      const raw = response.choices[0]?.message?.content || "{}";
let reply: string;
let status = "questioning";
let hint = "";
try {
  const parsed = JSON.parse(raw);
  reply = parsed.content || raw;
  status = parsed.status || "questioning";
  hint = parsed.hint || "";
} catch {
  reply = raw;
}

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

      return NextResponse.json({ reply, status, hint, quota });
    }

    // ── Streaming mode ──────────────────────────────────────────────
    const streamResponse = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
      response_format: { type: "json_object" },
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
