import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { caseUpdateSchema, formatZodErrors } from "@/lib/validators";
import { isEcgAcademyCase } from "@/lib/case-product";

export const dynamic = "force-dynamic";

// GET /api/cases/[id] — single case (published only for non-admin)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await isAdmin(_request.headers.get("cookie") || "");

    let query = supabaseAdmin.from("cases").select("*").eq("id", params.id);

    // Non-admin users can only fetch published cases
    if (!admin) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query.single();

    if (error) {
      return NextResponse.json({ error: "案例不存在或未发布" }, { status: 404 });
    }
    if (!data) {
      return NextResponse.json({ error: "案例不存在或未发布" }, { status: 404 });
    }

    const record = data as Record<string, unknown>;
    if (isEcgAcademyCase(record.content_json as Record<string, unknown> | undefined)) {
      return NextResponse.json({ error: "案例不存在或未发布" }, { status: 404 });
    }

    return NextResponse.json({ case: data });
  } catch (error: unknown) {
    console.error("GET /api/cases/[id] error:", error);
    return NextResponse.json({ error: "查询失败，请稍后重试" }, { status: 500 });
  }
}

// PUT /api/cases/[id] — admin update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = caseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "数据格式错误", details: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("cases")
      .update(parsed.data)
      .eq("id", params.id);
    if (error) {
      console.error("PUT /api/cases/[id] DB error:", error.message);
      return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("PUT /api/cases/[id] error:", error);
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}

// DELETE /api/cases/[id] — admin delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const { error } = await supabaseAdmin
      .from("cases")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("DELETE /api/cases/[id] DB error:", error.message);
      return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE /api/cases/[id] error:", error);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
