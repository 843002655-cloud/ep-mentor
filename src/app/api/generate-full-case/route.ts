import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL } from "@/lib/deepseek";
import { requireAdminApi } from "@/lib/api-utils";

function buildPrompt(imageCount: number): string {
  return `# Role
你是一位心脏电生理教学编辑。你的任务是：将PDF文献转换为中文苏格拉底式互动教学病例。

# Core Rule — 铁律
**所有文字内容必须来自PDF原文。你可以归纳、总结、翻译，但不能编造任何数据、患者信息、测量值、诊断结论。**

# Workflow（请按此顺序处理）
## Step 1：通读全文并归纳
- 提取所有患者信息（年龄/性别/主诉/病史/体检/合并症）
- 提取所有ECG和电生理发现（含原文测量值）
- 提取最终诊断
- 提取关键知识点
- 提取指南引用

## Step 2：图片信息整理（极其重要）
用户提供了 ${imageCount} 张图片，按PDF图号顺序排列（图1～图${imageCount}）。
请在原文中搜索每张图的标注：
- 英文文献搜索："Figure 1""Fig. 1""Figure 2""Fig. 2"...
- 中文文献搜索："图1""图2"...
对于每张图，提取：
- **图片标题**：PDF原文中该图的标题（可翻译为中文）
- **图片描述**：PDF原文中对该图的完整描述段落（可归纳但保留关键信息）
- **教学要点**：从原文描述中提炼这张图最有教学价值的内容
- **引导提问**：基于原文此图内容，设计一个苏格拉底式开放式问题

## Step 3：构建教学大纲
以图片为线索，设计递进式学习路径：
- Stage 0：患者背景与病史回顾
- Stage 1～N：每张图一个学习阶段，按图号顺序推进
- 最后阶段：诊断总结与知识点回顾

## Step 4：输出
**所有输出内容必须是中文。** 专业术语保留英文缩写（AVNRT、CTI、PVI等）。

# Output JSON Schema
{
  "title": "中文案例标题",
  "category": "SVT/VT/AF",
  "difficulty": "基础/进阶/高级",
  "source": "文献出处（原文引用，可保留英文）",
  "patient": {
    "age": "数字或空",
    "gender": "男/女或空",
    "chief_complaint": "中文主诉",
    "history": "中文现病史",
    "physical_exam": "中文体检要点",
    "comorbidities": ["中文合并症"]
  },
  "description": "中文病例摘要（50-100字）",
  "ecg_findings": {
    "summary": "中文ECG总体描述",
    "details": ["中文ECG特征（含原文测量值）"],
    "figures": [{
      "figure_number": "图1",
      "title": "原文图片标题的中文翻译",
      "description": "原文对该图的描述（中文归纳，保留原文关键信息）",
      "teaching_points": "从该图提炼的中文教学要点",
      "key_question": "基于该图的中文苏格拉底式提问"
    }]
  },
  "learning_stages": [{
    "stage": 1,
    "title": "中文阶段标题",
    "description": "本阶段学习目标（中文）",
    "question": "中文引导问题",
    "key_concept": "中文核心概念",
    "expected_answer_points": ["中文要点"],
    "common_mistakes": ["中文学员常见错误"],
    "figure_reference": "图X"
  }],
  "final_diagnosis": "中文最终诊断",
  "key_points": ["中文知识点"],
  "guideline_references": ["指南引用（可保留英文）"],
  "clinical_pearls": ["中文临床经验点"],
  "tags": ["中文标签"]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdminApi(request);
    if (denied) return denied;

    const { text, imageUrls, videoUrl } = await request.json();
    const imageCount = (imageUrls as string[])?.length || 0;

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "PDF 文字内容过少，请确认PDF为文字型文档" }, { status: 400 });
    }

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 8192,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildPrompt(imageCount) },
        { role: "user", content: `【PDF文献原文 — 以下所有内容来自用户上传的PDF】\n\n${text}`.slice(0, 60000) },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const caseData = JSON.parse(cleaned);

    caseData.image_urls = imageUrls || [];
    if (videoUrl) caseData.video_url = videoUrl;

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Generate full case error:", err);
    return NextResponse.json({ error: err.message || "生成失败" }, { status: 500 });
  }
}
