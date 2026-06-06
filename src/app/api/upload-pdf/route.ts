import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const EXTRACT_PROMPT = `# Role
你是电生理领域的医学编辑，擅长从学术文献中提取教学案例。

# Task
从以下文献文字内容中，提取并生成一个结构化的心脏电生理教学案例。

# Rules
1. 如果包含病例报告，提取关键临床信息
2. 如果是综述/指南，选择一个代表性教学场景
3. 医学术语要准确
4. 必须包含完整诊断逻辑链

# Output
严格输出以下 JSON，不要其他内容：
{
  "title": "案例标题（10字以内）",
  "category": "SVT/VT/AF/AFL 之一",
  "difficulty": "基础/进阶/高级",
  "description": "病史摘要（50-100字）",
  "ecg_findings": ["发现1","发现2","发现3","发现4"],
  "question": "苏格拉底式核心提问",
  "hint": "教学提示",
  "key_points": ["知识点1","知识点2","知识点3","知识点4"],
  "mapping_system": "Carto/EnSite/Rhythmia 或空字符串"
}`;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "文字内容过少，无法提取病例" }, { status: 400 });
    }

    const maxChars = 6000;
    const truncated = text.length > maxChars
      ? text.slice(0, maxChars)
      : text;

    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `文献内容：\n\n${truncated}` },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const caseData = JSON.parse(cleaned);

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: "提取失败，请重试" }, { status: 500 });
  }
}
