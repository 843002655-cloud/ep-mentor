import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL } from "@/lib/deepseek";
import { requireAdminApi } from "@/lib/api-utils";

const SOURCE_BOOK =
  "Clinical Cases in Cardiac Electrophysiology: Supraventricular Arrhythmias — Volume 1, Lucian Muresan (ed.), Springer 2022";

function buildBookCasePrompt(caseTitle: string, source: string, figureCount: number): string {
  return `# Role
你是一位心脏电生理教学编辑。你的任务是将英文病例书中的一个病例转化为中文苏格拉底式互动教学病例。

# Source
本书：${SOURCE_BOOK}
当前病例：${caseTitle}
原文含约 ${figureCount} 幅图（Fig. ${figureCount} 张 ECG/心超/CARTO 等），每张图均有 Fig.X.Y 编号的英文标注。

# Core Rule — 铁律
**所有文字内容必须来自原文。你可以翻译、归纳、总结，但不能编造任何患者数据、测量值、诊断结论。**
原文中的 Fig.X.Y 图片标注包含了 ECG/影像特征描述，**务必融入 ecg_findings 中**。

# Workflow
## Step 1：通读全文并归纳
- 提取患者信息（年龄/性别/主诉/病史/体检/合并症/用药）
- 提取所有 ECG 和电生理发现（含原文测量值、Fig 标注描述）
- 提取电生理检查和消融手术过程
- 提取选择题及正确答案
- 提取最终诊断
- 提取 Key Points / Clinical Pearls

## Step 2：构建教学病例
以苏格拉底式教学方法组织内容：
- 提供患者背景，让学员先思考
- 逐步展示 ECG/电生理发现，每步提问引导
- 解释消融策略的选择理由
- 总结关键知识点

## Step 3：出处标注
在病例末尾标注：
---
**来源**：${SOURCE_BOOK}
**原文标题**：${caseTitle}
---

# Output JSON Schema
{
  "title": "中文标题（体现心律失常类型和关键特征）",
  "category": "SVT",
  "difficulty": "基础/进阶/高级",
  "source": "${source}",
  "description": "中文病例摘要（50-100字）",
  "ecg_findings": {
    "summary": "中文 ECG 总体描述（含原文 Fig 标注的 ECG 特征）",
    "details": ["中文 ECG/电生理特征列表，融入 Fig 描述"]
  },
  "question": "苏格拉底式核心引导问题",
  "hint": "提示文字",
  "final_diagnosis": "中文最终诊断",
  "learning_stages": [{
    "stage": 1,
    "title": "中文阶段标题",
    "description": "本阶段学习目标",
    "question": "中文引导问题",
    "key_concept": "中文核心概念",
    "expected_answer_points": ["中文要点"],
    "common_mistakes": ["中文学员常见错误"],
    "figure_reference": "对应原文 Fig 编号"
  }],
  "key_points": ["中文关键知识点"],
  "clinical_pearls": ["中文临床经验"],
  "tags": ["标签"]
}`;
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdminApi(request);
    if (denied) return denied;

    const {
      text,
      case_index,
      case_title,
      source,
    }: {
      text?: string;
      case_index?: number;
      case_title?: string;
      source?: string;
    } = await request.json();

    if (!text || text.trim().length < 200) {
      return NextResponse.json(
        { error: "病例文字内容过少" },
        { status: 400 }
      );
    }

    const title = case_title || `Case ${case_index || "?"}`;
    const src = source || `${SOURCE_BOOK}, Case ${case_index || "?"}`;

    // Count figures for prompt context
    const figRe = new RegExp(`Fig\\.\\s*${case_index || "\\d+"}\\.(\\d+)\\s`, "g");
    const figs = new Set<number>();
    let fm;
    while ((fm = figRe.exec(text)) !== null) figs.add(parseInt(fm[1]));
    const figureCount = figs.size;

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 8192,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildBookCasePrompt(title, src, figureCount) },
        {
          role: "user",
          content: `【病例书原文 — ${title}】\n\n${text}`.slice(0, 60000),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const caseData = JSON.parse(cleaned);

    // Attach metadata
    caseData.source = src;
    caseData.case_index = case_index;
    caseData.figure_count = figureCount;

    return NextResponse.json({ case: caseData });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Generate book case error:", err);
    return NextResponse.json(
      { error: err.message || "生成失败" },
      { status: 500 }
    );
  }
}
