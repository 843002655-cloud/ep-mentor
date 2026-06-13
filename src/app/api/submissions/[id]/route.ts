import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { submissionUpdateSchema, formatZodErrors } from "@/lib/validators";

// PUT /api/submissions/[id] — admin review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = submissionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "数据格式错误", details: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("submissions")
      .update({ status: parsed.data.status })
      .eq("id", params.id);
    if (error) {
      console.error("PUT /api/submissions/[id] DB error:", error.message);
      return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("PUT /api/submissions/[id] error:", error);
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 });
  }
}
