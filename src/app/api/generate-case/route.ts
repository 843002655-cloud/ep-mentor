import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export async function POST(request: NextRequest) {
  try {
    const { category, difficulty, count = 1 } = await request.json();

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 }
      );
    }

    const prompt = `请生成 ${count} 个心脏电生理教学案例，要求：
- 分类：${category}
- 难度：${difficulty}

严格按照以下JSON数组格式输出，不要有任何其他内容：
[
  {
    "title": "案例标题（10字以内）",
    "description": "患者病史摘要（50-80字，包含年龄、性别、主诉、关键体征）",
    "ecg_findings": ["心电图发现1", "心电图发现2", "心电图发现3", "心电图发现4"],
    "question": "给学员的核心问题（引导思考诊断和处理策略）",
    "hint": "教学提示（帮助学员思考方向，不直接给出答案）",
    "key_points": ["知识点1", "知识点2", "知识点3", "知识点4"]
  }
]

只输出JSON数组，不要包含markdown代码块标记。`;

    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是一位资深心脏电生理教育专家，擅长编写教学案例。只能输出有效的JSON格式数据，不要包含任何其他内容。",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content || "[]";

    // Clean markdown code fences if present
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const cases = JSON.parse(cleaned);

    return NextResponse.json({ cases });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Generate case API error:", err);
    return NextResponse.json(
      { error: err.message || "案例生成失败" },
      { status: 500 }
    );
  }
}
