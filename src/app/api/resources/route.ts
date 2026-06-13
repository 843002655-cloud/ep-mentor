import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { resourceSchema, formatZodErrors } from "@/lib/validators";

// GET /api/resources — list all
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabaseAdmin
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);

  const { data } = await query;
  return NextResponse.json({ resources: data || [] });
}

// POST /api/resources — admin create
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = resourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "数据格式错误", details: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("resources").insert(parsed.data);
    if (error) {
      console.error("POST /api/resources DB error:", error.message);
      return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("POST /api/resources error:", error);
    return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
