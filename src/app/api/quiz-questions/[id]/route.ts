import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";

// PUT /api/quiz-questions/[id] — admin update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const { error } = await supabaseAdmin
      .from("quiz_questions")
      .update(body)
      .eq("id", params.id);
    if (error) {
      console.error("PUT /api/quiz-questions/[id] DB error:", error.message);
      return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("PUT /api/quiz-questions/[id] error:", error);
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}

// DELETE /api/quiz-questions/[id] — admin delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const { error } = await supabaseAdmin
      .from("quiz_questions")
      .delete()
      .eq("id", params.id);
    if (error) {
      console.error("DELETE /api/quiz-questions/[id] DB error:", error.message);
      return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE /api/quiz-questions/[id] error:", error);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
