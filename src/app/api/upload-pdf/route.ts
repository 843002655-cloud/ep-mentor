import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Use bundled worker — pure JS, zero native deps
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
严格按照以下 JSON 格式输出：
{
  "title": "案例标题（10字以内）",
  "category": "SVT / VT / AF / AFL 之一",
  "difficulty": "基础 / 进阶 / 高级",
  "description": "病史摘要（50-100字）",
  "ecg_findings": ["发现1", "发现2", "发现3", "发现4"],
  "question": "苏格拉底式核心提问",
  "hint": "教学提示",
  "key_points": ["知识点1", "知识点2", "知识点3", "知识点4"],
  "mapping_system": "Carto / EnSite / Rhythmia 或其他"
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "仅支持 PDF 格式" }, { status: 400 });

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Extract text using pdfjs-dist
    let pdfText = "";
    try {
      const loadingTask = pdfjsLib.getDocument({ data: uint8 });
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        pdfText += pageText + "\n";
      }
    } catch {
      return NextResponse.json({ error: "PDF 解析失败，请确认文件未加密且包含可提取的文字" }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json({ error: "PDF 文字内容过少，可能为扫描件" }, { status: 400 });
    }

    // Truncate for DeepSeek context
    const maxChars = 6000;
    const truncated = pdfText.length > maxChars
      ? pdfText.slice(0, maxChars) + "\n\n[截断 " + (pdfText.length - maxChars) + " 字符]"
      : pdfText;

    // Send to AI
    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `以下是一篇电生理文献内容。请从中提取教学案例：\n\n${truncated}` },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    let caseData;
    try {
      caseData = JSON.parse(cleaned);
    } catch {
      caseData = JSON.parse(raw);
    }

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    console.error("PDF error:", error);
    return NextResponse.json({ error: "处理失败，请重试" }, { status: 500 });
  }
}
