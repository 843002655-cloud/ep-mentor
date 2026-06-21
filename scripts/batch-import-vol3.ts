/**
 * Batch import: Vol 3 Ventricular Arrhythmias PDF → 20 structured teaching cases → Supabase
 * Usage: npx tsx scripts/batch-import-vol3.ts
 */
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ── Load .env.local ─────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(import.meta.dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Config ──────────────────────────────────────────────────
const PDF_PATH = "E:/电子书/Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf";
const SOURCE_BOOK =
  "Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias — Volume 3, Lucian Muresan (ed.), Springer 2024";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Split text by case headers ─────────────────────────────
function splitByCaseHeaders(text: string): { index: number; text_chunk: string }[] {
  // Vol 3 case headers: number on one line, "Case N" on next, then authors
  // Pattern: \d+\s*\nCase\s+(\d+)\s*\n
  const re = /\d+\s*\nCase\s+(\d+)\s*\n/g;
  const matches: { index: number; pos: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // Skip TOC entries (first few matches in the table of contents)
    // TOC is at beginning of PDF, matches after position ~15000 are actual cases
    if (m.index > 10000) {
      matches.push({ index: parseInt(m[1]), pos: m.index });
    }
  }
  // Deduplicate by case number (keep first occurrence = actual case, not TOC)
  const seen = new Set<number>();
  const deduped: { index: number; pos: number }[] = [];
  for (const match of matches) {
    if (!seen.has(match.index)) {
      seen.add(match.index);
      deduped.push(match);
    }
  }
  deduped.sort((a, b) => a.index - b.index);

  const cases: { index: number; text_chunk: string }[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const start = deduped[i].pos;
    const end = i < deduped.length - 1 ? deduped[i + 1].pos : text.length;
    cases.push({ index: deduped[i].index, text_chunk: text.slice(start, end).trim() });
  }
  return cases;
}

// ── Normalize category ─────────────────────────────────────
const VALID_CATEGORIES = ["SVT", "VT", "AF", "AFL"];
function normalizeCategory(cat?: string): string {
  if (!cat) return "VT";
  if (cat.includes("/")) cat = cat.split("/")[0].trim();
  const upper = cat.toUpperCase();
  if (upper === "SVT" || upper === "VT" || upper === "AF") return upper;
  if (upper === "AFL") return "AF";
  return "VT"; // default for this volume
}

// ── Flatten case for DB insert ─────────────────────────────
function flattenCase(c: Record<string, unknown>, extra?: Record<string, unknown>) {
  return {
    title: (c.title as string || "未命名").slice(0, 200),
    category: normalizeCategory(c.category as string) || "VT",
    difficulty: c.difficulty || "基础",
    description: (c.description as string || "").slice(0, 500),
    ecg_findings:
      ((c.ecg_findings as Record<string, unknown>)?.details as string[]) ||
      (c.ecg_findings as string[]) ||
      [],
    question: (c.question as string || "").slice(0, 500),
    hint: (c.hint as string || "").slice(0, 500),
    key_points: c.key_points || [],
    is_published: false,
    mapping_system: (c.mapping_system as string) || "",
    content_json: { ...c, ...extra } as Record<string, unknown>,
  };
}

// ── AI Prompt ───────────────────────────────────────────────
function buildPrompt(caseTitle: string) {
  return `# Role
你是一位心脏电生理教学编辑。将英文病例书的一个病例转化为中文苏格拉底式互动教学病例。

# Source
本书：${SOURCE_BOOK}
当前病例：${caseTitle}
原文中含 Fig.X.Y 标注描述 ECG/影像特征，请融入 ecg_findings 中。

# Core Rule — 铁律
所有内容必须来自原文。可翻译、归纳，不能编造数据。
在病例末尾标注出处：**来源**：${SOURCE_BOOK}  **原文标题**：${caseTitle}

# Output JSON (no markdown, pure JSON)
{
  "title": "中文标题",
  "category": "VT",
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
}`;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("📖 Reading PDF...");
  const pdfPath = fs.existsSync(PDF_PATH)
    ? PDF_PATH
    : "E:/电子书/Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf";
  const buf = fs.readFileSync(pdfPath);
  const data = await pdf(buf);
  const text = data.text;
  console.log(`   ${data.numpages} pages, ${text.length} chars`);

  // Phase 1: Split
  console.log("\n🔍 Splitting into individual cases...");
  const cases = splitByCaseHeaders(text);
  console.log(`   ${cases.length} cases identified`);
  cases.forEach((c) => console.log(`   Case ${c.index}: ${c.text_chunk.length} chars`));

  // Phase 2: Generate each case
  console.log("\n🤖 Generating cases via DeepSeek...");
  const results: { index: number; data: Record<string, unknown> | null; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`   [${i + 1}/${cases.length}] Case ${c.index}... `);
    try {
      const resp = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        max_tokens: 8192,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildPrompt(`Case ${c.index}`) },
          { role: "user", content: `【病例书原文 — Case ${c.index}】\n\n${c.text_chunk}`.slice(0, 60000) },
        ],
      });
      const raw = resp.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const caseData = JSON.parse(cleaned) as Record<string, unknown>;
      caseData.source = `${SOURCE_BOOK}, Case ${c.index}`;
      results.push({ index: c.index, data: caseData, ok: true });
      console.log("✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("❌", msg.slice(0, 80));
      results.push({ index: c.index, data: null, ok: false, error: msg });
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Phase 3: Save to Supabase
  console.log("\n💾 Saving to Supabase...");
  let saved = 0;
  for (const r of results) {
    if (!r.ok || !r.data) continue;
    try {
      const flat = flattenCase(r.data, { source_book: `Case ${r.index}` });
      const { error } = await supabase.from("cases").insert(flat).select("id").single();
      if (error) throw new Error(error.message);
      saved++;
      console.log(`   ✅ Case ${r.index} saved`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`   ❌ Case ${r.index} save failed:`, msg.slice(0, 80));
    }
  }

  console.log(`\n🎉 Done! ${saved}/${cases.length} cases imported.`);
}

main().catch((e: unknown) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
