import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";

// ── Clients ──────────────────────────────────────────────────────────────

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const bailian = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const VISION_MODEL = process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max";
const MAX_CONTEXT_MESSAGES = 20;

// ── System Prompts ───────────────────────────────────────────────────────

const SYSTEM_TEXT = `# Role
你是一位世界级心脏电生理专家，在 Cleveland Clinic 拥有 25 年导管消融经验，
完成超过 8,000 例复杂心律失常消融，发表 300+ 篇 SCI 论文（含 Circulation、JACC、Heart Rhythm），
担任 HRS/ESC 指南撰写委员会委员。

你正在回答一位中国心脏电生理医生的专业问题。

# 回答风格
- 直接给出结论，然后展开论证。像主任医师在查房时回答主治医生的提问。
- 引用具体文献/指南（年份、出处、关键数据），不是泛泛而谈。
- 保留英文术语和缩写（AVNRT, delta wave, ERP, entrainment, PVI, CTI, ATP, IVA, LCP, LVOT, RVOT, LBBB, RBBB, PVC, VT, AF, AFL, SVT 等），首次出现可加中文注释。
- 使用精确的医学表述：测量值、百分比、区间、解剖位置。

# 回答结构
复杂问题按以下结构回答（简单问题可简化）：

**要点**
用 2-3 句话给出核心结论。

**机制与证据**
解释病理电生理机制，引用关键研究和指南。

**临床处理**
具体的标测策略、消融参数、终点判定。可分享实际手术经验。

**参考文献**
列出 1-3 篇关键文献或指南（格式：作者, 期刊, 年份; 关键结论）。

**一句话总结**
临床 take-home message。

# 格式要求
- 使用 Markdown 格式组织内容
- 用 **加粗** 标注关键概念
- 用 \`代码\` 标注参数数值
- 列表用 - 开头
- 回复长度：简单问题 150-300 字，复杂问题 600-1200 字
- 用中文回答`;

const SYSTEM_VISION = `# Role
你是一位资深心脏电生理专家，在 Mayo Clinic 拥有 30 年导管消融经验，
发表过 200 余篇 SCI 论文，参与制定 ACC/HRS 指南。

你现在在回答一位心脏电生理医生的问题。

# 回答要求
1. 直接回答问题，给出专业、有深度的分析
2. 回答基于最新指南（2023-2025 HRS/ESC）和临床证据
3. 保留关键英文术语（AVNRT, delta wave, ERP, entrainment, PVI, CTI, ATP 等）
4. 可以分享真实临床经验增加可信度
5. 复杂概念用简短例子说明
6. 用中文回答，专业术语保留英文缩写
7. 使用 Markdown 格式组织内容

# 图片分析
当用户上传心电图或腔内图时：
- 先用 **技术性语言** 描述观察到的特征（节律、波形、间期、形态、测量值）
- 再给出你的分析和诊断意见
- 说明诊断依据和鉴别要点`;

// ── Helpers ──────────────────────────────────────────────────────────────

/** Check if any message in the array contains images */
function hasImages(messages: unknown[]): boolean {
  return messages.some((msg: unknown) => {
    const m = msg as { content?: unknown };
    return Array.isArray(m.content)
      && m.content.some((p: unknown) => (p as { type?: string }).type === "image_url");
  });
}

function buildApiMessages(
  messages: unknown[],
  systemPrompt: string
): ChatCompletionMessageParam[] {
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);

  for (const msg of recent) {
    const m = msg as { role: string; content: unknown };
    if (m.role === "system") continue;

    if (typeof m.content === "string") {
      if (m.role === "assistant") {
        apiMessages.push({ role: "assistant", content: m.content });
      } else {
        apiMessages.push({ role: "user", content: m.content });
      }
    } else if (Array.isArray(m.content)) {
      const parts = m.content.map(
        (part: { type: string; text?: string; image_url?: { url: string } }) => {
          if (part.type === "image_url" && part.image_url) {
            return {
              type: "image_url" as const,
              image_url: { url: part.image_url.url },
            };
          }
          return { type: "text" as const, text: part.text || "" };
        }
      );
      apiMessages.push({ role: "user", content: parts });
    }
  }

  return apiMessages;
}

async function createStream(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  maxTokens = 2000
) {
  const aiStream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });
}

function streamResponse(readable: ReadableStream) {
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeError(err: unknown) {
  const e = err as { message?: string; status?: number; code?: string };
  if (e.status === 429 || e.code === "rate_limit_exceeded") {
    return { status: 429, error: "当前咨询人数较多，请稍后再试" };
  }
  if (e.status === 401 || e.status === 403) {
    return { status: 500, error: "AI 顾问暂未配置，请联系管理员" };
  }
  if (e.code === "context_length_exceeded" || e.status === 400) {
    return { status: 400, error: "对话过长，请清空记录后重试" };
  }
  return { status: 500, error: "AI 服务暂时不可用，请稍后重试" };
}

// ── POST Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { messages, stream } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    // ── Route: images → Bailian vision; text-only → DeepSeek ──────────
    const needsVision = hasImages(messages);

    if (needsVision) {
      if (!process.env.DASHSCOPE_API_KEY) {
        return NextResponse.json(
          { error: "图片分析功能暂未配置" },
          { status: 500 }
        );
      }

      const apiMessages = buildApiMessages(messages, SYSTEM_VISION);

      if (stream) {
        const readable = await createStream(bailian, VISION_MODEL, apiMessages);
        return streamResponse(readable);
      }

      const response = await bailian.chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 2000,
        temperature: 0.7,
        messages: apiMessages,
      });

      const reply = response.choices[0]?.message?.content || "抱歉，无法生成回复。";
      return NextResponse.json({ reply });
    }

    // ── Text-only → DeepSeek ───────────────────────────────────────────
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "AI 顾问暂未配置" },
        { status: 500 }
      );
    }

    const apiMessages = buildApiMessages(messages, SYSTEM_TEXT);

    if (stream) {
      // DeepSeek with larger max_tokens for richer responses
      const readable = await createStream(deepseek, DEEPSEEK_MODEL, apiMessages, 4096);
      return streamResponse(readable);
    }

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      messages: apiMessages,
    });

    const reply = response.choices[0]?.message?.content || "抱歉，无法生成回复。";
    return NextResponse.json({ reply });

  } catch (error: unknown) {
    console.error("Consult API error:", error);
    const { status, error: msg } = safeError(error);
    return NextResponse.json({ error: msg }, { status });
  }
}
