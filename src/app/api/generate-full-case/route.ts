import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function buildPrompt(category: string, difficulty: string, imageCount: number, hasVideo: boolean): string {
  const videoHint = hasVideo ? '\n- Video reference available: include video_url if relevant' : '';
  return `# ⚠️ 你是文献内容提取器，严格从原文提取，不编造 ⚠️

# RULES
1. **从原文提取所有信息**。搜索原文中的患者信息（年龄/性别/主诉/病史）、ECG测量值、诊断结论。
2. **关键：图片描述提取** — 原文中有 ${imageCount} 张图片对应的描述。请仔细搜索原文中以下模式：
   - "图1" "图 1" "Fig. 1" "Figure 1"
   - "图2" "图 2" "Fig. 2" "Figure 2" (以此类推到图${imageCount})
   找到后，将原文中紧跟在图号后面的**完整段落**填入对应 figures[].description。
   **图注通常在原文中是独立段落，包含"如图所示""见图X""Figure X shows"等引导词。请仔细查找。**
3. 如果确实找不到某图描述，填原文中与该图最相关的内容段落。
4. key_points 从原文提取。question 基于原文内容撰写。
5. 数据缺失时填空字符串，不要编造。

# Task
从下方【PDF 文献原文】中提取内容，填入 JSON 结构。缺失的信息留空字符串 ""，不要编造。

# Context
- 用户标记的分类：${category} / 难度：${difficulty}
- 图片数量：${imageCount} 张（按文献图号顺序：图1~图${imageCount}）
${videoHint}

# Output JSON Schema
{
  "title": "文献中的病例标题（原文）",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "source": "文献出处（如有）",
  "patient": {
    "age": "原文数字", "gender": "原文性别",
    "chief_complaint": "原文主诉",
    "history": "原文病史（直接引用）",
    "physical_exam": "原文体检",
    "comorbidities": ["原文合并症"]
  },
  "description": "从文献提取的病例摘要",
  "ecg_findings": {
    "summary": "文献原文ECG描述",
    "details": ["文献中提到的ECG特征（含原文测量值）"],
    "figures": [{
      "figure_number": "图1",
      "title": "文献中原图的标题",
      "description": "文献中对图1的原文描述",
      "teaching_points": "文献中提到的这张图的教学要点",
      "key_question": "基于文献此图内容提出的开放式问题"
    }]
  },
  "learning_stages": [{
    "stage": 1,
    "title": "从文献内容提炼的阶段",
    "question": "基于文献此阶段内容的提问",
    "key_concept": "文献提到的核心概念",
    "expected_answer_points": ["文献中暗示的答案要点"],
    "figure_reference": "对应图号"
  }],
  "final_diagnosis": "文献中的最终诊断",
  "key_points": ["文献原文中的知识点"],
  "guideline_references": ["文献引用的指南"],
  "clinical_pearls": ["文献中提到的临床经验"],
  "tags": ["文献关键词"]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const { text, imageUrls, videoUrl, category, difficulty } = await request.json();
    const imageCount = (imageUrls as string[])?.length || 0;
    const hasText = text && text.trim().length >= 50;
    // Allow generation with just images (even without PDF text)
    if (!hasText && imageCount === 0) {
      return NextResponse.json({ error: "请提供 PDF 文字或上传图片" }, { status: 400 });
    }
    const effectiveText = hasText ? text : `请根据提供的 ${imageCount} 张电生理图片，生成一个苏格拉底式互动教学案例。`;
    const hasVideo = !!videoUrl;

    const response = await deepseek.chat.completions.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(category, difficulty, imageCount, hasVideo) },
        { role: "user", content: `【PDF 文献原文 — 严格从中提取，不得编造。特别注意查找"图1""图2""Fig"等标注，完整提取每张图的标题和描述段落】\n\n${effectiveText}`.slice(0, 25000) },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const caseData = JSON.parse(cleaned);

    // Merge uploaded resources
    caseData.image_urls = imageUrls || [];
    if (videoUrl) caseData.video_url = videoUrl;

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Generate full case error:", err);
    return NextResponse.json({ error: err.message || "生成失败" }, { status: 500 });
  }
}
