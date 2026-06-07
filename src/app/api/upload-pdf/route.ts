import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function buildPrompt(imageUrls: string[]): string {
  const imageList = imageUrls.length > 0
    ? `\n# Extracted PDF page images\n${imageUrls.map((url, i) => `Page ${i + 1}: ${url}`).join("\n")}\nReference these in figure URLs.`
    : "";

  return `# Role
你是顶级电生理医学编辑。从以下文献内容中提取所有可教学的信息，生成一个**完整的互动教学案例JSON**。

# CRITICAL RULES
1. **从文献原文提取，不编造数据**：年龄/性别/测量值/图片描述必须来自文献
2. **图片描述是关键**：文献中提到每一张图，都要详细描述其内容（包括图中的标注、箭头、颜色标记、测量数据）
3. **教学价值优先**：每个finding和stage都要有明确的教学目的
4. **苏格拉底式提问**：每个stage的question必须开放式，不能用是/否回答
5. **保留英文缩写**：AVNRT, CTI, PPI-TCL, LCP, His, CS, RV等
${imageList}

# Output JSON Schema (MUST follow exactly)
{
  "title": "案例标题（15字内）",
  "category": "SVT/VT/AF/AFL",
  "difficulty": "基础/进阶/高级",
  "estimated_minutes": 数字,
  "source": "来源文献名",
  "patient": {
    "age": 数字, "gender": "男/女", "occupation": "职业或退休",
    "chief_complaint": "主诉", "history": "现病史(100-150字)",
    "physical_exam": "体格检查", "comorbidities": ["合并症"]
  },
  "ecg_findings": {
    "summary": "心电图总体描述",
    "details": ["具体发现1(含测量值)","发现2","发现3","发现4","发现5"],
    "figures": [{
      "figure_number": "图1", "title": "图片标题",
      "description": "详细描述图中内容、波形、测量数据、标注",
      "teaching_points": "这张图的核心教学价值",
      "key_question": "针对这张图的苏格拉底式提问(开放式)"
    }]
  },
  "learning_stages": [{
    "stage": 1, "title": "阶段标题",
    "description": "本阶段学习目标",
    "question": "引导问题(开放式，不能用是/否回答)",
    "key_concept": "核心知识点",
    "expected_answer_points": ["学员应提到的要点"],
    "common_mistakes": ["常见错误"],
    "figure_reference": "参考图号"
  }],
  "final_diagnosis": "最终诊断(标准医学名称)",
  "key_points": ["知识点1","知识点2","知识点3","知识点4","知识点5","知识点6"],
  "guideline_references": ["指南推荐1(年份+级别)","指南推荐2"],
  "clinical_pearls": ["临床经验1","临床经验2","临床经验3"],
  "tags": ["标签1","标签2"],
  "mapping_system": "Carto/EnSite/Rhythmia 或空字符串",
  "image_urls": ["图片URL列表"]
}

# Requirements
- learning_stages 必须包含4-6个阶段，从初步诊断→鉴别→EP检查→消融策略→验证
- ecg_findings.figures 必须详细描述文献中每张图的内容
- 每个stage的question必须引导学员观察对应的图片
- key_points 必须是独立的记忆点，每个一句话
- 总计JSON约2000-3000字，内容充实`;}

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
