import { NextRequest, NextResponse } from "next/server";
import { deepseek, DEEPSEEK_MODEL } from "@/lib/deepseek";
import { requireAdminApi } from "@/lib/api-utils";

const SYSTEM_PROMPT = `# Role
你是电生理领域的医学编辑，擅长将临床手记转化为标准化的教学病例（Case Report）。

# Standards
1. 术语准确，使用中文标准术语（如"房室结双径路"而非"双通道"）
2. 每个病例遵循结构化模板：病史 → ECG → EPS 关键发现 → 鉴别诊断 → 消融策略
3. 加入真实临床常见的陷阱和误区
4. 难度需匹配指定的等级`;

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdminApi(request);
    if (denied) return denied;

    const { category, difficulty, count = 1 } = await request.json();

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 }
      );
    }

    const prompt = `请生成 ${count} 个心脏电生理教学案例，分类：${category}，难度：${difficulty}。

每个案例需包含以下结构化的临床内容：

1. **病例摘要**: 主诉（一句话）、病史（年龄/性别/既往史）、体表 ECG 特征（P 波、PR 间期、QRS 宽度、RP 关系）
2. **电生理检查**: 基线 AH/HV 间期、用什么程序刺激诱发了什么心动过速、关键腔内图特征（V-A-V 模式、A 波最早点、His 不应期刺激结果等）
3. **机制分析与鉴别**: 最可能的诊断 + 排除其他机制的关键依据
4. **消融与结果**: 靶点定位方法、消融终点、是否行异丙肾验证

严格按照以下 JSON 数组输出，不要包含任何其他内容：
[
  {
    "title": "案例标题（10字以内）",
    "description": "病史摘要（50-100字，含年龄/性别/主诉/关键 ECG 特征）",
    "ecg_findings": ["心电图发现1", "心电图发现2", "心电图发现3", "心电图发现4"],
    "question": "苏格拉底式核心提问（引导学员思考诊断逻辑和处理策略）",
    "hint": "教学提示（指出思考方向，不直接给答案）",
    "key_points": ["知识点1", "知识点2", "知识点3", "知识点4"]
  }
]

只输出 JSON 数组，不要包含 markdown 代码块标记。`;

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt + '\n\n输出必须是一个 JSON 对象，格式为：{ "cases": [...] }' },
      ],
    });

    const text = response.choices[0]?.message?.content || '{"cases":[]}';

    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const cases = Array.isArray(parsed) ? parsed : (parsed.cases || []);

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
