import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function buildPrompt(imageUrls: string[]): string {
  const imageList = imageUrls.length > 0
    ? `\n\n# Available images (extracted from PDF pages)\n${imageUrls.map((url, i) => `Page ${i + 1}: ${url}`).join("\n")}\n\nSelect the 3-5 most relevant images and include them in image_urls with figure labels.`
    : "";

  return `# Role
你是电生理领域的医学编辑，擅长从学术文献中提取教学案例。

# Task
从以下文献内容中，提取并生成一个**详细的**心脏电生理教学案例。

# Rules
1. **病例摘要**：从文献中提取真实患者信息（年龄/性别/主诉/既往史/用药）
2. **ECG/EPS发现**：提取所有可用于教学的心电图特征（至少4条）
3. **分步教学**：设计3-4个逐层递进的教学问题
4. **关键知识点**：提取4-6个核心知识点
5. 医学术语准确，保留必要英文缩写

${imageList}

# Output
严格输出以下 JSON，不要其他内容：
{
  "title": "案例标题（15字以内）",
  "category": "SVT/VT/AF/AFL 之一",
  "difficulty": "基础/进阶/高级",
  "description": "病史摘要（80-150字）",
  "ecg_findings": ["发现1","发现2","发现3","发现4","发现5"],
  "question": "分步教学问题（用分号分隔）",
  "hint": "教学提示",
  "key_points": ["知识点1","知识点2","知识点3","知识点4","知识点5","知识点6"],
  "mapping_system": "Carto/EnSite/Rhythmia 或空字符串",
  "image_urls": ["图1URL","图2URL"...]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text as string;
    const imageUrls = (body.imageUrls as string[]) || [];

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "文字内容过少，无法提取病例" }, { status: 400 });
    }

    const maxChars = 6000;
    const truncated = text.length > maxChars
      ? text.slice(0, maxChars)
      : text;

    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(imageUrls) },
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
