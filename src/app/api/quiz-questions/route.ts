import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { quizQuestionSchema, formatZodErrors } from "@/lib/validators";

// GET /api/quiz-questions — list all
export async function GET() {
  const { data } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .order("created_at", { ascending: false });
  return NextResponse.json({ questions: data || [] });
}

// POST /api/quiz-questions — admin create
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = quizQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "数据格式错误", details: formatZodErrors(parsed.error) }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("quiz_questions").insert(parsed.data);
    if (error) {
      console.error("POST /api/quiz-questions DB error:", error.message);
      return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("POST /api/quiz-questions error:", error);
    return NextResponse.json({ error: "创建失败，请稍后重试" }, { status: 500 });
  }
}
