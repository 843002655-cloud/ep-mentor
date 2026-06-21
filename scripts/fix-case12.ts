import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function loadEnv() {
  const envPath = path.join(import.meta.dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eqIdx = t.indexOf("=");
    if (eqIdx < 0) continue;
    const key = t.slice(0, eqIdx).trim();
    if (!process.env[key]) process.env[key] = t.slice(eqIdx + 1).trim();
  }
}
loadEnv();

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOURCE_BOOK =
  "Clinical Cases in Cardiac Electrophysiology: Atrial Fibrillation and Atrial Flutter — Volume 2, Lucian Muresan (ed.), Springer 2023";

const VALID_CATEGORIES = ["SVT", "VT", "AF", "AFL"];
function normalizeCategory(cat?: string): string {
  if (!cat) return "AF";
  if (cat.includes("/")) cat = cat.split("/")[0].trim();
  const upper = cat.toUpperCase();
  if (upper === "SVT" || upper === "VT") return upper;
  if (upper === "AFL") return "AF"; // mapped until DB adds AFL
  return "AF";
}

async function main() {
  // Extract just Case 12 text
  const PDF_PATH = "E:\\fk claude\\ep-mentor\\scripts\\svt-case-book.pdf";
  const buf = fs.readFileSync(PDF_PATH);
  const data = await pdf(buf);
  const text = data.text;

  const re = /\d+\s*\nCase\s+(\d+)\s*\n/g;
  const matches: { index: number; pos: number }[] = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > 13000) matches.push({ index: parseInt(m[1]), pos: m.index });
  }

  // Find Case 12
  const c12Idx = matches.findIndex(m => m.index === 12);
  if (c12Idx < 0) { console.log("Case 12 not found!"); return; }
  const start = matches[c12Idx].pos;
  const end = c12Idx < matches.length - 1 ? matches[c12Idx + 1].pos : text.length;
  const caseText = text.slice(start, end).trim();
  console.log(`Case 12 text: ${caseText.length} chars`);

  // Generate
  console.log("Generating via DeepSeek...");
  const resp = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    max_tokens: 8192,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是一位心脏电生理教学编辑。将英文病例书的一个病例转化为中文苏格拉底式互动教学病例。
本书：${SOURCE_BOOK}
当前病例：Case 12
原文中含 Fig.X.Y 标注描述 ECG/影像特征，请融入 ecg_findings 中。
铁律：所有内容必须来自原文，可翻译、归纳，不能编造数据。
在病例末尾标注出处。

Output JSON:
{
  "title": "中文标题",
  "category": "AF 或 AFL",
  "difficulty": "基础/进阶/高级",
  "description": "中文病例摘要",
  "ecg_findings": { "summary": "ECG总体描述", "details": ["特征列表"] },
  "question": "苏格拉底式核心提问",
  "hint": "提示",
  "final_diagnosis": "中文最终诊断",
  "learning_stages": [{ "stage": 1, "title": "阶段标题", "description": "学习目标", "question": "引导问题", "key_concept": "核心概念", "expected_answer_points": ["要点"], "common_mistakes": ["常见错误"] }],
  "key_points": ["知识点"],
  "clinical_pearls": ["临床经验"],
  "tags": ["标签"]
}`,
      },
      { role: "user", content: `【病例书原文 — Case 12】\n\n${caseText}`.slice(0, 60000) },
    ],
  });

  const raw = resp.choices[0]?.message?.content || "{}";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const caseData = JSON.parse(cleaned);
  caseData.source = `${SOURCE_BOOK}, Case 12`;

  const cat = normalizeCategory(caseData.category as string);
  console.log(`AI category: "${caseData.category}" -> normalized: "${cat}"`);

  // Save
  const flat = {
    title: (caseData.title || "未命名").slice(0, 200),
    category: cat,
    difficulty: caseData.difficulty || "基础",
    description: (caseData.description || "").slice(0, 500),
    ecg_findings:
      ((caseData.ecg_findings as Record<string, unknown>)?.details as string[]) ||
      (caseData.ecg_findings as string[]) || [],
    question: (caseData.question || "").slice(0, 500),
    hint: (caseData.hint || "").slice(0, 500),
    key_points: caseData.key_points || [],
    is_published: false,
    mapping_system: (caseData.mapping_system as string) || "",
    content_json: { ...caseData, source_book: "Case 12" },
  };
  console.log("Inserting:", JSON.stringify({title: flat.title, category: flat.category, difficulty: flat.difficulty}));

  const { data: insertData, error } = await supabase.from("cases").insert(flat).select("id").single();
  if (error) {
    console.log("ERROR:", error.message);
    console.log("Full error:", JSON.stringify(error));
  } else {
    console.log("SUCCESS:", insertData);
  }
}

main();
