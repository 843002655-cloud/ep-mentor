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
从以下 PDF 文献内容中，提取并生成一个结构化的心脏电生理教学案例。

# Rules
1. 如果文献包含病例报告，提取关键临床信息
2. 如果文献是综述/指南，选择一个代表性的教学场景
3. 保持医学术语的准确性
4. 生成的案例必须包含完整的诊断逻辑链

# Output Format
严格按照以下 JSON 格式输出，不要包含任何其他内容：
{
  "title": "案例标题（10字以内，反映核心教学点）",
  "category": "SVT / VT / AF / AFL 之一",
  "difficulty": "基础 / 进阶 / 高级",
  "description": "病史摘要（50-100字，包含年龄/性别/主诉/关键体征）",
  "ecg_findings": ["心电图发现1", "心电图发现2", "心电图发现3", "心电图发现4"],
  "question": "苏格拉底式核心提问（引导学员思考诊断逻辑和处理策略）",
  "hint": "教学提示（指出思考方向，不直接给答案）",
  "key_points": ["知识点1", "知识点2", "知识点3", "知识点4"],
  "mapping_system": "Carto / EnSite / Rhythmia 或其他，如不确定留空"
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 格式" }, { status: 400 });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pdfText: string;
    try {
      const { PDFParse } = await import("pdf-parse") as unknown as { PDFParse: (buf: Buffer) => Promise<{ text: string }> };
      const pdfData = await PDFParse(buffer);
      pdfText = pdfData.text;
    } catch {
      return NextResponse.json(
        { error: "PDF 解析失败，请确认文件未加密且包含可提取的文字" },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF 文字内容过少，可能为扫描件（暂不支持 OCR）" },
        { status: 400 }
      );
    }

    // Truncate if too long (DeepSeek context limit)
    const maxChars = 8000;
    const truncated =
      pdfText.length > maxChars
        ? pdfText.slice(0, maxChars) + "\n\n[内容已截断，剩余 " + (pdfText.length - maxChars) + " 字符]"
        : pdfText;

    // Send to AI
    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `以下是一篇电生理相关文献/病例报告的内容。请从中提取教学案例：\n\n${truncated}` },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const caseData = JSON.parse(cleaned);

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("PDF upload error:", err);
    return NextResponse.json(
      { error: err.message || "处理失败" },
      { status: 500 }
    );
  }
}
