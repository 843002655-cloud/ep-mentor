/**
 * Batch import: SVT Case Book PDF → 20 structured teaching cases → Supabase
 * Usage: npx tsx scripts/batch-import-book.ts
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
const PDF_PATH = path.join(import.meta.dirname, "svt-case-book.pdf");
const SOURCE_BOOK =
  "Clinical Cases in Cardiac Electrophysiology: Atrial Fibrillation and Atrial Flutter — Volume 2, Lucian Muresan (ed.), Springer 2023";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── TOC parsing (same logic as split-pdf-cases API) ─────────
function parseTOCTitles(text: string): Map<number, string> {
  const titles = new Map<number, string>();
  const tocStart = text.indexOf("Case 1: Typical Counterclockwise");
  const bodyStart = text.indexOf("1\nCase 1\nFrédéric");
  if (tocStart < 0 || bodyStart < 0 || tocStart >= bodyStart) return titles;
  const toc = text.slice(tocStart, bodyStart);
  const markerRe = /Case\s+(\d+):\s+/g;
  const entries: { num: number; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(toc)) !== null) {
    entries.push({ num: parseInt(m[1]), start: m.index + m[0].length });
  }
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].start;
    const dotIdx = toc.indexOf(". .", start);
    let end: number;
    if (dotIdx >= 0 && (i === entries.length - 1 || dotIdx < entries[i + 1].start)) {
      end = dotIdx;
    } else {
      end = i < entries.length - 1 ? toc.lastIndexOf("Case", entries[i + 1].start - 5) : toc.length;
    }
    const raw = toc.slice(start, end).replace(/\s+/g, " ").trim();
    titles.set(entries[i].num, `Case ${entries[i].num}: ${raw}`);
  }
  return titles;
}

function splitByCaseHeaders(text: string): { index: number; text_chunk: string }[] {
  const re = /\d+\s*\nCase\s+(\d+)\s*\n/g;
  const matches: { index: number; pos: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > 13000) matches.push({ index: parseInt(m[1]), pos: m.index });
  }
  const cases: { index: number; text_chunk: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].pos;
    const end = i < matches.length - 1 ? matches[i + 1].pos : text.length;
    cases.push({ index: matches[i].index, text_chunk: text.slice(start, end).trim() });
  }
  return cases;
}

// ── Normalize category to valid DB values ────────────────────
const VALID_CATEGORIES = ["SVT", "VT", "AF", "AFL"];
function normalizeCategory(cat?: string): string {
  if (!cat) return "AF";
  // Map common AI outputs
  if (cat.includes("/")) cat = cat.split("/")[0].trim();
  const upper = cat.toUpperCase();
  // DB constraint currently only allows SVT/VT/AF (AFL not yet added)
  if (upper === "SVT" || upper === "VT") return upper;
  if (upper === "AFL") return "AF"; // mapped until DB adds AFL
  return "AF"; // default for this volume
}

// ── Flatten case for DB insert (matches case-utils.ts) ──────
function flattenCase(c: Record<string, unknown>, extra?: Record<string, unknown>) {
  return {
    title: (c.title as string || "未命名").slice(0, 200),
    category: normalizeCategory(c.category as string) || "AF",
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
  "category": "AF/AFL",
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
  const buf = fs.readFileSync(PDF_PATH);
  const data = await pdf(buf);
  const text = data.text;
  console.log(`   ${data.numpages} pages, ${text.length} chars`);

  // Phase 1: Split
  console.log("\n🔍 Splitting into individual cases...");
  const tocTitles = parseTOCTitles(text);
  const rawCases = splitByCaseHeaders(text);
  const cases = rawCases.map((rc) => ({
    index: rc.index,
    title: tocTitles.get(rc.index) || `Case ${rc.index}`,
    text_chunk: rc.text_chunk,
    char_count: rc.text_chunk.length,
  }));
  console.log(`   ${cases.length} cases identified`);
  cases.forEach((c) => console.log(`   #${c.index}: ${c.title.slice(0, 80)} (${c.char_count} chars)`));

  // Phase 2: Generate each case
  console.log("\n🤖 Generating cases via DeepSeek...");
  const results: { index: number; title: string; data: Record<string, unknown> | null; ok: boolean; error?: string }[] = [];
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
          { role: "system", content: buildPrompt(c.title) },
          { role: "user", content: `【病例书原文 — ${c.title}】\n\n${c.text_chunk}`.slice(0, 60000) },
        ],
      });
      const raw = resp.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const caseData = JSON.parse(cleaned) as Record<string, unknown>;
      caseData.source = `${SOURCE_BOOK}, Case ${c.index}`;
      results.push({ index: c.index, title: c.title, data: caseData, ok: true });
      console.log("✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("❌", msg.slice(0, 60));
      results.push({ index: c.index, title: c.title, data: null, ok: false, error: msg });
    }
  }

  // Phase 3: Save to Supabase
  console.log("\n💾 Saving to Supabase...");
  let saved = 0;
  for (const r of results) {
    if (!r.ok || !r.data) continue;
    try {
      const flat = flattenCase(r.data, { source_book: r.title });
      const { error } = await supabase.from("cases").insert(flat).select("id").single();
      if (error) throw new Error(error.message);
      saved++;
      console.log(`   ✅ #${r.index} saved`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`   ❌ #${r.index} save failed:`, msg.slice(0, 60));
    }
  }

  console.log(`\n🎉 Done! ${saved}/${cases.length} cases imported.`);
}

main().catch((e: unknown) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
