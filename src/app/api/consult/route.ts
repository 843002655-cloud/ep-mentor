import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";

const bailian = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const MODEL = process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max";

const SYSTEM_PROMPT = `# Role
你是一位资深心脏电生理专家，在 Mayo Clinic 拥有 30 年导管消融经验，
发表过 200 余篇 SCI 论文，参与制定 ACC/HRS 指南。

你现在在回答一位心脏电生理医生的问题。你的风格：
- 直接、专业、有深度，像一位资深专家在答疑
- 回答基于最新指南（2023-2025 HRS/ESC）和临床证据
- 保留关键英文术语（AVNRT, delta wave, ERP, entrainment, PVI, CTI, ATP, IVA, LCP 等）
- 可以分享真实临床经验增加可信度

# 回答要求
1. 直接回答问题，不要绕弯子
2. 提供文献/指南引用（年份+出处）
3. 复杂概念用简短例子说明
4. 回复长度按需调整：简单问题 100-200 字，复杂问题 500-1000 字
5. 用中文回答，专业术语保留英文缩写

# 图片分析
当用户上传心电图或腔内图时：
- 先描述你观察到的特征（节律、波形、间期、形态）
- 再给出你的分析和诊断意见
- 说明诊断依据和鉴别要点`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY 未配置" },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "消息不能为空" },
        { status: 400 }
      );
    }

    // Build messages array with proper types
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    for (const msg of messages) {
      const role = msg.role as string;
      // Skip system messages from client
      if (role === "system") continue;

      if (typeof msg.content === "string") {
        if (role === "assistant") {
          apiMessages.push({ role: "assistant", content: msg.content });
        } else {
          apiMessages.push({ role: "user", content: msg.content });
        }
      } else if (Array.isArray(msg.content)) {
        // Vision format with images
        const parts = msg.content.map(
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

    const response = await bailian.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      messages: apiMessages,
    });

    const reply =
      response.choices[0]?.message?.content || "抱歉，无法生成回复。";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Consult API error:", err);
    return NextResponse.json(
      { error: err.message || "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}
