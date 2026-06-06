import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";

// GET /api/cases/[id] — single case
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!data) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ case: data });
}

// PUT /api/cases/[id] — admin update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(request.headers.get("cookie") || ""))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await request.json();
  const { error } = await supabaseAdmin
    .from("cases")
    .update(body)
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/cases/[id] — admin delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(request.headers.get("cookie") || ""))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const { error } = await supabaseAdmin
    .from("cases")
    .delete()
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
