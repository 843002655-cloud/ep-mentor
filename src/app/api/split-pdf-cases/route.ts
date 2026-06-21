import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-utils";

interface SplitCase {
  index: number;
  title: string;
  text_chunk: string;
  figure_count: number;
  char_count: number;
}

/**
 * Parse TOC section to extract full case titles.
 * The TOC in this PDF spans positions from first "Case 1: Typical..." (TOC only)
 * to the body chapter header "1\nCase 1\nFrédéric".
 * Each TOC entry: "Case N: Title text... . . [page]"
 */
function parseTOCTitles(text: string): Map<number, string> {
  const titles = new Map<number, string>();

  // TOC boundaries: first occurrence of "Case 1: Typical..." is in the TOC;
  // the body content starts with "1\nCase 1\n" chapter header
  const tocStart = text.indexOf("Case 1: Typical Counterclockwise");
  const bodyStart = text.indexOf("1\nCase 1\nFrédéric");
  if (tocStart < 0 || bodyStart < 0 || tocStart >= bodyStart) return titles;

  const toc = text.slice(tocStart, bodyStart);

  // Find all "Case N: " marker positions
  const markerRe = /Case\s+(\d+):\s+/g;
  const entries: { num: number; start: number }[] = [];
  let m;
  while ((m = markerRe.exec(toc)) !== null) {
    entries.push({ num: parseInt(m[1]), start: m.index + m[0].length });
  }

  // Extract title for each entry: from "Case N: " until ". ." (page reference dots)
  for (let i = 0; i < entries.length; i++) {
    const start = entries[i].start;
    // ". ." (two dots) is the universal delimiter before page numbers
    const dotIdx = toc.indexOf(". .", start);
    let end: number;
    if (dotIdx >= 0 && (i === entries.length - 1 || dotIdx < entries[i + 1].start)) {
      end = dotIdx;
    } else {
      // Fallback: use next entry's position
      end = i < entries.length - 1
        ? toc.lastIndexOf("Case", entries[i + 1].start - 5)
        : toc.length;
    }
    let raw = toc.slice(start, end);
    raw = raw.replace(/\s+/g, " ").trim();
    titles.set(entries[i].num, `Case ${entries[i].num}: ${raw}`);
  }

  return titles;
}

/**
 * Split body text by "Case N" chapter headers.
 * Returns array of { index, text_chunk } for cases 1-20.
 */
function splitByCaseHeaders(text: string): { index: number; text_chunk: string }[] {
  const re = /\d+\s*\nCase\s+(\d+)\s*\n/g;
  const matches: { index: number; pos: number }[] = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    // Only count matches after TOC/frontmatter (position > 13000)
    if (m.index > 13000) {
      matches.push({ index: parseInt(m[1]), pos: m.index });
    }
  }

  const cases: { index: number; text_chunk: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].pos;
    const end = i < matches.length - 1 ? matches[i + 1].pos : text.length;
    cases.push({
      index: matches[i].index,
      text_chunk: text.slice(start, end).trim(),
    });
  }
  return cases;
}

/** Count unique Fig.X.Y numbers for a given case index */
function countFigures(text: string, caseIndex: number): number {
  const figs = new Set<number>();
  const re = new RegExp(`Fig\\.\\s*${caseIndex}\\.(\\d+)\\s`, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    figs.add(parseInt(m[1]));
  }
  return figs.size;
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdminApi(request);
    if (denied) return denied;

    const { text } = await request.json();
    if (!text || text.trim().length < 5000) {
      return NextResponse.json(
        { error: "PDF 文字内容过少，请确认 PDF 为文字型文档" },
        { status: 400 }
      );
    }

    // 1. Parse TOC titles
    const tocTitles = parseTOCTitles(text);

    // 2. Split by case headers
    const rawCases = splitByCaseHeaders(text);

    // 3. Build result with titles and figure counts
    const cases: SplitCase[] = rawCases.map((rc) => ({
      index: rc.index,
      title:
        tocTitles.get(rc.index) || `Case ${rc.index}`,
      text_chunk: rc.text_chunk,
      figure_count: countFigures(rc.text_chunk, rc.index),
      char_count: rc.text_chunk.length,
    }));

    return NextResponse.json({ cases, total: cases.length });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Split PDF cases error:", err);
    return NextResponse.json({ error: err.message || "拆分失败" }, { status: 500 });
  }
}
