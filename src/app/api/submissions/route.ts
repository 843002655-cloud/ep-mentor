import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin, requireAuth } from "@/lib/api-utils";

// GET /api/submissions — admin list submissions
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request.headers.get("cookie") || ""))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data } = await query;
  return NextResponse.json({ submissions: data || [] });
}

// POST /api/submissions — authenticated user submits a case
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request.headers.get("cookie") || "");
    if (!auth) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const body = await request.json();
    const { error } = await supabaseAdmin.from("submissions").insert({
      ...body,
      status: "pending",
    });
    if (error) {
      console.error("POST /api/submissions DB error:", error.message);
      return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 500 });
  }
}
