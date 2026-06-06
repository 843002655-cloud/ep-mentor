import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";

// GET /api/quiz-questions — list all
export async function GET() {
  const { data } = await supabaseAdmin
    .from("quiz_questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ questions: data || [] });
}

// POST /api/quiz-questions — admin create
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request.headers.get("cookie") || ""))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await request.json();
  const { error } = await supabaseAdmin.from("quiz_questions").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
