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
从以下文献内容中，提取并生成一个**详细的**心脏电生理教学案例。要求充分利用文献中的临床数据和图表信息，构建一个完整的教学路径。

# Rules
1. **病例摘要**：从文献中提取真实患者信息（年龄/性别/主诉/既往史/用药），不编造，文献缺信息可省略
2. **ECG/EPS发现**：从文献中提取所有可以教学的心电图特征（至少4条），优先使用文献中描述的实际测量值和波形特征
3. **分步教学**：设计3-4个逐层递进的教学问题，模仿导管室里的思考过程——从体表ECG → 腔内图鉴别 → 消融策略
4. **关键知识点**：提取4-6个核心知识点，优先用文献本身的教学要点
5. 医学术语准确，保留必要英文缩写（AVNRT、CTI、PVI等）

# Output
严格输出以下 JSON，不要其他内容：
{
  "title": "案例标题（15字以内，反映文献核心）",
  "category": "SVT/VT/AF/AFL 之一",
  "difficulty": "基础/进阶/高级",
  "description": "病史摘要（含年龄性别主诉关键体征，80-150字，充分利用文献内容）",
  "ecg_findings": ["详细心电图发现1（含测量值）","发现2","发现3","发现4","发现5"],
  "question": "分步教学问题：Step1-体表ECG初步分析 → Step2-腔内电图关键鉴别点 → Step3-消融策略选择？用分号分隔各步骤",
  "hint": "教学提示（引导思考方向，不直接给药方）",
  "key_points": ["知识点1","知识点2","知识点3","知识点4","知识点5","知识点6"],
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
      max_tokens: 4096,
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
