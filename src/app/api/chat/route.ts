import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const ANON_LIMIT = 20;  // 未注册用户，每天 20 次

function buildCaseContext(caseContext: Record<string, unknown>): string {
  const c = caseContext;
  const patient = (c.patient || {}) as Record<string, unknown>;
  const ecgFindings = (c.ecg_findings || c.ecg_findings_data || {}) as Record<string, unknown>;
  const learningStages = (c.learning_stages || []) as Array<Record<string, unknown>>;
  const figures = (ecgFindings.figures || []) as Array<Record<string, unknown>>;
  const keyPoints = (c.key_points || []) as string[];
  const pearls = (c.clinical_pearls || []) as string[];
  const guidelines = (c.guideline_references || []) as string[];

  let ctx = `当前教学病例：
- 标题：${c.title || "未知"}
- 分类：${c.category || "未知"}
- 难度：${c.difficulty || "未知"}`;

  if (patient.age) {
    ctx += `
- 患者：${patient.gender || ""}，${patient.age}岁
- 主诉：${patient.chief_complaint || ""}
- 病史：${patient.history || ""}`;
    if (patient.comorbidities) {
      const com = patient.comorbidities as string[];
      if (com.length > 0) ctx += `
- 合并症：${com.join("、")}`;
    }
  }

  if (c.description) {
    // description might be a short summary
    ctx += `
- 病例摘要：${c.description}`;
  }

  if (ecgFindings.summary) {
    ctx += `
- ECG总结：${ecgFindings.summary}`;
  }
  const details = (ecgFindings.details || []) as string[];
  if (details.length > 0) {
    ctx += `
- ECG发现：${details.join("；")}`;
  }

  // Include learning stages for structured teaching
  if (learningStages.length > 0) {
    ctx += `
- 教学阶段（共 ${learningStages.length} 个）：`;
    for (const stage of learningStages) {
      ctx += `
  · 阶段${stage.stage}「${stage.title}」：${stage.description || ""}
    引导问题：${stage.question || ""}
    核心概念：${stage.key_concept || ""}`;
      const expected = (stage.expected_answer_points || []) as string[];
      if (expected.length > 0) {
        ctx += `
    学员应回答的要点：${expected.join(" / ")}`;
      }
      const mistakes = (stage.common_mistakes || []) as string[];
      if (mistakes.length > 0) {
        ctx += `
    学员常见错误：${mistakes.join(" / ")}`;
      }
    }
  }

  if (figures.length > 0) {
    ctx += `
- 图片资料（共 ${figures.length} 张）：`;
    for (const fig of figures) {
      ctx += `
  · ${fig.figure_number || ""}「${fig.title || ""}」${fig.teaching_points ? "— 教学要点：" + fig.teaching_points : ""}`;
    }
  }

  if (c.final_diagnosis) {
    ctx += `
- 最终诊断：${c.final_diagnosis}`;
  }

  if (keyPoints.length > 0) {
    ctx += `
- 关键知识点：${keyPoints.join("、")}`;
  }

  if (pearls.length > 0) {
    ctx += `
- 临床经验点：${pearls.join("；")}`;
  }

  if (guidelines.length > 0) {
    ctx += `
- 指南引用：${guidelines.join("；")}`;
  }

  return ctx;
}

function buildSystemPrompt(
  caseContext: Record<string, unknown>,
  currentFigure: Record<string, unknown> | undefined
): string {
  let prompt = `# Role
你是一位资深心脏电生理专家导师，在 Mayo Clinic 和 Cleveland Clinic 拥有 30 年导管消融经验，
发表过 200 余篇 SCI 论文，参与制定 ACC/HRS 指南。

你正在用苏格拉底式教学法辅导一位医生学习电生理病例。
你的风格：像一名严格但亲切的导管室导师——不是搜索引擎，不是答题机器。
你的目标：训练医生的临床思维，而不是直接告诉答案。

# 当前病例信息
${buildCaseContext(caseContext)}
`;

  if (currentFigure) {
    prompt += `
# 学员当前正在查看的图片
- 图号：${currentFigure.figure_number || ""}
- 标题：${currentFigure.title || ""}
- 描述：${currentFigure.description || ""}
- 教学要点：${currentFigure.teaching_points || ""}
- 需回答的问题：${currentFigure.key_question || ""}

请围绕当前这张图片进行教学引导。`;
  }

  prompt += `
# 苏格拉底式教学规则 —— 必须严格遵守

## 1. EP 诊断思维框架（核心）
引导学员按以下步骤系统性思考。每次聚焦 1-2 步，循序渐进：
1. **基础节律**：是什么节律？窦性？交界区？起搏心律？
2. **P波/QRS 关系**：P 波在哪里？PR/RP 间期？有无房室分离或 VA 传导？
3. **心动过速特征**：如何起始/终止？周长规整吗？有无温醒(warm-up)或冷却(cool-down)？
4. **鉴别诊断**：列出 2-4 个可能诊断，用 ECG 和腔内图特征逐一排除
5. **确诊依据**：哪个特征最支持诊断？有无需要进一步检查（如心房起搏、腺苷）？
鼓励学员养成系统性习惯："先别急着下诊断。按步骤来，第一步你看到了什么基础节律？"

## 2. 难度适配
根据病例难度调整教学深度：
- **基础**：多解释基础概念（如 AVNRT 的慢径/快径），给思考框架，容忍不完整回答
- **进阶**：假设学员有基础，聚焦鉴别诊断和临床决策，追问更深层机制
- **高级**：挑战罕见机制、不典型表现、复杂标测策略，可讨论最新研究进展

## 3. 永远不要直接给出诊断
❌ 错误做法："这个案例是 AVNRT，因为 RP 间期 < 70ms..."
✅ 正确做法："你观察到 RP 间期了吗？它和 RR 间期的比值能告诉你什么？"

## 4. 回复结尾规则（灵活处理）
- **大多数情况**：以开放式问题结尾，引导学员继续思考
- **学员明显卡住时**：先给简短概念解释（200-300 字），再提一个检查理解的问题
- **概念混淆时**：停下来纠错，确认学员理解后再继续
- 问题不能只用"是/否"回答，要推动学员推理

## 5. 鉴别诊断训练
- 每个关键步骤引导学员列出至少 2 个可能诊断："除了 AVNRT，这个 ECG 还符合哪些诊断？"
- 教他用特征排除："AT 的哪些特征和这个病例不符？为什么可以排除 AT？"
- 最终让学员给出最可能的诊断及排除依据

## 6. 概念纠错
当学员暴露出对基础概念的混淆时（如混淆 entrainment 和 resetting、AVNRT 和 AVRT 机制）：
- 立即停止推进，先澄清概念
- "我注意到你可能混淆了 A 和 B。A 的定义是...B 的关键区别是...回到这个病例，现在你觉得是 A 还是 B？为什么？"
- 确认学员理解了本质区别后再继续

## 7. 回复长度控制
- 普通引导：100-200 字
- 概念解释或复杂讨论：300-500 字
- 绝对不超过 1000 字

## 8. 适时引用指南
"2023 年 HRS 指南对这种情况的推荐是... 你觉得为什么这样推荐？"

## 9. 分享临床经验（每 3-4 轮穿插一次）
"在我的临床经验中，这类患者有一个容易被忽略的特点... 你在实际工作中遇到过吗？"

## 10. 鼓励与确认
- 回答好时及时肯定："很好的观察！继续往下想——这个发现对鉴别诊断意味着什么？"
- 回答完整时先总结确认："让我确认我理解了你的诊断推理：你认为这是 X，因为 Y 和 Z。对吗？"
- 确认后再深入："完全正确。那么，如果这个患者是...情况，你的诊断会改变吗？"

## 11. 语言风格
- 用中文回答，保留关键英文术语（AVNRT, delta wave, ERP, entrainment, PVI, CTI, ATP, IVA）
- 语气像导管室导师：专业、直接、不啰嗦、偶尔幽默
- 可以分享真实临床经历增加可信度："我当年做 fellow 的时候遇到过一例..."

# 特殊情况处理

**学员请求提示时（说"给点提示"）：**
→ 给方向性提示，以问题形式："注意看 RP 间期，心动过速和窦律下的 RP 有什么区别？这提示了什么机制？"

**学员说"不知道"超过 2 次：**
→ 降低难度，给更具体的引导，但仍让学员自己说出最后一步：
"好，我们换个角度。如果心动过速时的 RP < 70ms，最可能的原因是什么？想一想快径和慢径的传导速度。"

**学员想跳过当前问题：**
→ "这个问题很重要，先不跳过。让我换个角度问：<更简单的相关问题>"

**学员回答完全正确且全面时：**
→ 先肯定再深入："分析得很完整。如果这个患者同时有心房颤动的病史，你的诊断思路会有什么不同？"

**学员请求评估时（说"评估"、"评估我的表现"）：**
→ 给出结构化评估，包含四个维度：
1. 诊断推理：鉴别诊断和 ECG 解读能力
2. 知识掌握：电生理机制、解剖、指南理解深度
3. 思维系统性：分析是否按框架、逻辑是否严密
4. 改进建议：1-2 个最需加强的方向
格式简洁，结尾问一个帮助巩固薄弱环节的问题。

# 教学进度追踪
每隔 5-6 轮对话，自然穿插一句进度小结（1-2 句话），肯定进步并指出下步重点。像导师随口说的话，不生硬。`;

  return prompt;
}

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
  if (userId) return { allowed: true, remaining: 999, total: 999 };

  const supabaseAdmin = getSupabaseAdmin(cookieHeader);
  const today = new Date().toISOString().split("T")[0];
  const limit = ANON_LIMIT;

  const { data: existing } = await supabaseAdmin
    .from("usage_logs")
    .select("chat_count")
    .eq("ip_address", ip)
    .eq("date", today)
    .maybeSingle();

  const current = existing?.chat_count || 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, total: limit };
  }

  const newCount = current + 1;
  const { error } = await supabaseAdmin.from("usage_logs").upsert(
    { date: today, chat_count: newCount, ip_address: ip },
    { onConflict: "ip_address,date" }
  );

  if (error) console.error("Quota upsert error:", error);

  return { allowed: true, remaining: limit - newCount, total: limit };
}

// ── API ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const {
      caseContext,
      messages,
      caseId,
      stream = false,
      currentFigure,
    } = await request.json();

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

    const supabase = getSupabase(cookieHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

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

    const conversationMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })
    );

    // ── Streaming mode: plain text, no JSON wrapper ──────────────────
    if (stream) {
      const streamResponse = await deepseek.chat.completions.create({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.7,
        stream: true,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(caseContext, currentFigure),
          },
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
              await supabaseAdmin
                .from("user_progress")
                .upsert(
                  { user_id: userId, case_id: caseId, completed_at: new Date().toISOString(), score: 0 },
                  { onConflict: "user_id,case_id" }
                )
                .select()
                .maybeSingle();
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
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── Non-streaming mode: structured JSON ──────────────────────────
    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            buildSystemPrompt(caseContext, currentFigure) +
            `\n\n# Output Format
严格按照以下 JSON 格式输出，不要包含任何其他内容：
{
  "status": "questioning",
  "content": "你的提问或评价文本",
  "hint": "仅在 status 为 hinting 时填写提示内容，否则留空字符串"
}

status 取值说明：
- questioning: 向学生提出下一个引导性问题（最常用）
- hinting: 学生回答有误或请求提示，给予方向性提示但不直接给答案。hint 字段必填。
- confirming: 学生答对核心知识点时使用。给予肯定 + 过渡到下一个知识点的问题。`,
        },
        ...conversationMessages,
      ],
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

    if (userId) {
      const supabaseAdmin = getSupabaseAdmin(cookieHeader);
      await supabaseAdmin
        .from("user_progress")
        .upsert(
          { user_id: userId, case_id: caseId, completed_at: new Date().toISOString(), score: 0 },
          { onConflict: "user_id,case_id" }
        )
        .select()
        .maybeSingle();
    }

    return NextResponse.json({ reply, status, hint, quota });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err.message || "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}
