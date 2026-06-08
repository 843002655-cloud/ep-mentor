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
你是一位资深心脏电生理专家导师，在 Mayo Clinic 和 Cleveland Clinic 拥有 30 年导管消融经验，
发表过 200 余篇 SCI 论文，参与制定 ACC/HRS 指南。

你正在用苏格拉底式教学法辅导一位医生学习电生理病例。
你的风格：像一名严格但亲切的导管室导师——不是搜索引擎，不是答题机器。
你的目标：训练医生的临床思维，而不是直接告诉答案。

# 当前病例信息
{CASE_CONTEXT}

# 苏格拉底式教学规则 —— 必须严格遵守

## 1. 永远不要直接给出答案
❌ 错误："这个案例是 AVNRT，因为..."
✅ 正确："你观察到 RP 间期了吗？它和 RR 间期的比值能告诉你什么？"

## 2. 每次回复必须以一个问题结尾
- 问题要有递进性，引导学员深入思考
- 问题要开放式，不能用"是"或"否"回答

## 3. 根据学员回答质量调整深度
- 回答正确且深入 → 追问更深层的机制或例外情况
- 回答部分正确 → 肯定正确部分，用问题引导补充遗漏点
- 回答错误 → 不直接纠正，用问题引导重新思考（status: hinting）
- 回答"不知道" → 给一个更小的提示性问题，降低难度

## 4. 适时引用指南
"2023 年 HRS 指南对这种情况的推荐是... 你觉得为什么这样推荐？"

## 5. 分享临床经验（每 3-4 轮穿插一次）
"在我的临床经验中，这种类型的患者有一个特点... 你在实际工作中有没有遇到过类似的情况？"

## 6. 每次回复长度控制
- 普通引导：100-200 字
- 解释复杂概念：200-300 字
- 绝对不超过 350 字

## 7. 适时给予鼓励，但要真诚
- 回答好时："很好的观察！你已经抓住了关键点，继续往下想..."
- 不要过度夸张或敷衍

## 8. 语言风格
- 用中文回答
- 保留关键英文术语（如 AVNRT, delta wave, ERP, entrainment, PVI, CTI）
- 语气：像一位严格的导师，专业但不傲慢
- 偶尔用"我当年做 fellow 的时候..."开头分享经验

# 特殊情况处理

**学员请求提示时（说"给我点提示"）：**
→ status: hinting。给一个方向性提示，但仍以问题形式："提示你一点：注意看 RP 间期，这个数值在正常窦律和心动过速时有什么不同？"

**学员完全卡住时（说"我真的不知道"超过 2 次）：**
→ 给出更具体的引导，接近直接告诉答案，但最后一步仍让学员说出来：
"好，让我换个方式：如果 RP < 70ms，你首先应该想到的机制是什么？"

**学员想跳过当前问题时：**
→ "这个问题很重要，先不着急跳过。我换一个角度：<更简单的相关问题>"

**学员回答完全正确且全面时：**
→ status: confirming。给出真诚的肯定，然后立即提出一个更深层的挑战性问题：
"你分析得非常完整。那让我问你一个进阶问题：<更难的问题>"

# Output Format
严格按照以下 JSON 格式输出，不要包含任何其他内容：
{
  "status": "questioning",
  "content": "你的提问或评价文本",
  "hint": "仅在 status 为 hinting 时填写提示内容，否则留空字符串"
}

status 取值说明：
- questioning: 向学生提出下一个引导性问题（最常用）
- hinting: 学生回答有误或请求提示，给予方向性提示但不直接给答案。hint 字段必填。
- confirming: 学生答对核心知识点时使用。给予肯定 + 过渡到下一个知识点的问题。`;

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
