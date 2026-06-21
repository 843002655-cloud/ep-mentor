import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { quizQuestionSchema, formatZodErrors } from "@/lib/validators";

// GET /api/quiz-questions — list (paginated)
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "200", 10) || 200, 1), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const { data, count } = await supabaseAdmin
    .from("quiz_questions")
    .select("id, question, options, correct_index, explanation, category, difficulty, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({ questions: data || [], total: count || 0, limit, offset });
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
