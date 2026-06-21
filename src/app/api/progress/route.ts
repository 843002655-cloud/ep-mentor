import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-utils";
import { EP_MENTOR_CASES_OR_FILTER } from "@/lib/case-product";

// GET /api/progress — user's own progress (EP Mentor cases only)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("cookie") || "");
  if (!auth) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const [{ data: epCases }, { data: allProgress }] = await Promise.all([
    supabaseAdmin.from("cases").select("id").or(EP_MENTOR_CASES_OR_FILTER).eq("is_published", true),
    supabaseAdmin
      .from("user_progress")
      .select("case_id, completed_at, cases(title, category)")
      .eq("user_id", auth.userId)
      .order("completed_at", { ascending: false }),
  ]);

  const epCaseIds = new Set((epCases || []).map((c) => c.id as string));
  const progress = (allProgress || []).filter((p) => epCaseIds.has(p.case_id as string));

  return NextResponse.json({ progress, totalCases: epCaseIds.size });
}
