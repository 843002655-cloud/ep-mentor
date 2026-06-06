import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/api-utils";

// GET /api/progress — user's own progress
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("cookie") || "");
  if (!auth) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("user_progress")
    .select("case_id, completed_at, cases(title, category)")
    .eq("user_id", auth.userId)
    .order("completed_at", { ascending: false });

  // Count total published cases
  const { count } = await supabaseAdmin
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);

  return NextResponse.json({ progress: data || [], totalCases: count || 0 });
}
