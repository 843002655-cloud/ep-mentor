import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { caseSchema, formatZodErrors } from "@/lib/validators";
import { fetchLearnerCounts } from "@/lib/learner-stats";
import { EP_MENTOR_CASES_OR_FILTER, withEpMentorProduct } from "@/lib/case-product";

const CASE_LIST_COLUMNS =
  "id, title, category, difficulty, description, key_points, is_published, mapping_system, created_at, content_json";

function dedupeCasesByTitle(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = row.title as string;
    const existing = seen.get(key);
    if (
      !existing ||
      new Date(row.created_at as string) < new Date(existing.created_at as string)
    ) {
      seen.set(key, row);
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  );
}

// GET /api/cases — list cases (public: published only; admin: all)
// Excludes ecg-academy product rows (shared Supabase backend)
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const admin = await isAdmin(request.headers.get("cookie") || "");

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "500", 10) || 500, 1), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  let query = supabaseAdmin
    .from("cases")
    .select(CASE_LIST_COLUMNS)
    .or(EP_MENTOR_CASES_OR_FILTER)
    .order("created_at", { ascending: false });

  const mapping = searchParams.get("mapping_system");

  if (!admin) query = query.eq("is_published", true);
  if (category) query = query.eq("category", category);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (mapping) query = query.eq("mapping_system", mapping);

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/cases error:", error.message);
    return NextResponse.json({ error: "加载病例失败" }, { status: 500 });
  }

  const deduped = dedupeCasesByTitle((data || []) as Record<string, unknown>[]);
  const total = deduped.length;
  const result = deduped.slice(offset, offset + limit);
  const caseIds = result.map((r) => r.id as string);
  const learnerCounts = await fetchLearnerCounts(supabaseAdmin, caseIds);

  return NextResponse.json({ cases: result, learnerCounts, total, limit, offset });
}

// POST /api/cases — admin create case
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = caseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "数据格式错误", details: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const payload = {
      ...parsed.data,
      content_json: withEpMentorProduct(
        parsed.data.content_json as Record<string, unknown> | undefined
      ),
    };
    const { error, data } = await supabaseAdmin.from("cases").insert(payload).select().single();
    if (error) {
      console.error("POST /api/cases DB error:", error.message);
      return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ case: data });
  } catch (error: unknown) {
    console.error("POST /api/cases error:", error);
    return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
