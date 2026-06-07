import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function buildPrompt(category: string, difficulty: string, imageCount: number, hasVideo: boolean): string {
  const videoHint = hasVideo ? '\n- Video reference available: include video_url if relevant' : '';
  return `# Role
顶级电生理医学编辑。从以下文献内容中生成一个完整的苏格拉底式互动教学案例。

# Context
- 分类：${category} / 难度：${difficulty}
- 图片数量：${imageCount} 张（按 PDF 图号顺序排列）
${videoHint}

# Requirements
1. 所有数据从文献原文提取，不编造
2. 为每一张图设计一个苏格拉底式提问
3. 回答必须是开放式，不能用是/否回答
4. 保留英文缩写（AVNRT, CTI, PVI, His, CS等）

# Output JSON Schema (MUST follow exactly)
{
  "title": "案例标题（15字内）",
  "category": "${category}",
  "difficulty": "${difficulty}",
  "source": "来源文献",
  "patient": {
    "age": 数字, "gender": "男/女",
    "chief_complaint": "主诉",
    "history": "现病史(100-150字)",
    "physical_exam": "体检要点",
    "comorbidities": ["合并症"]
  },
  "description": "病例一句话摘要",
  "ecg_findings": {
    "summary": "总体描述",
    "details": ["发现1(含测量值)","发现2","发现3","发现4","发现5"],
    "figures": [{
      "figure_number": "图1",
      "title": "图片标题",
      "description": "图片内容详细描述",
      "teaching_points": "这张图的核心教学价值",
      "key_question": "苏格拉底式提问(开放式)"
    }]
  },
  "learning_stages": [{
    "stage": 1,
    "title": "阶段标题",
    "question": "引导问题",
    "key_concept": "核心知识点",
    "expected_answer_points": ["要点1","要点2"],
    "common_mistakes": ["错误1"],
    "figure_reference": "参考图号"
  }],
  "final_diagnosis": "标准诊断名称",
  "key_points": ["知识点1","知识点2","知识点3","知识点4","知识点5","知识点6"],
  "guideline_references": ["指南+年份+级别"],
  "clinical_pearls": ["经验1","经验2"],
  "tags": ["标签1","标签2"]
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
      max_tokens: 4096,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(category, difficulty, imageCount, hasVideo) },
        { role: "user", content: `${effectiveText}\n\n${hasText ? "以上是文献原文，请提取病例。" : "请根据图片生成病例。分类：" + category + "，难度：" + difficulty}`.slice(0, 8000) },
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
