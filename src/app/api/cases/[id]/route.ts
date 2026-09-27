import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin, getAccessLevel, getUserId } from "@/lib/api-utils";
import { caseUpdateSchema, formatZodErrors } from "@/lib/validators";
import { isEcgAcademyCase } from "@/lib/case-product";
import { buildLearnerKey, getLearnedCaseIds, recordCaseOpened, FREE_CASE_LIMIT } from "@/lib/learner-stats";

export const dynamic = "force-dynamic";

// GET /api/cases/[id] — single case (published only for non-admin)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessLevel = await getAccessLevel(_request.headers.get("cookie") || "");

    let query = supabaseAdmin.from("cases").select("*").eq("id", params.id);

    // 非管理员只能看已发布
    if (accessLevel !== "admin") {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: "案例不存在或未发布" }, { status: 404 });
    }

    const record = data as Record<string, unknown>;
    if (isEcgAcademyCase(record.content_json as Record<string, unknown> | undefined)) {
      return NextResponse.json({ error: "案例不存在或未发布" }, { status: 404 });
    }

    // 免费/匿名用户：按病例数限制（可学 FREE_CASE_LIMIT 个）
    if (accessLevel !== "pro" && accessLevel !== "admin") {
      const ip = _request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const userId = await getUserId(_request.headers.get("cookie") || "");
      const learnerId = _request.nextUrl.searchParams.get("learnerId") || "";
      const learnerKey = buildLearnerKey(userId, learnerId, ip);

      const learnedIds = await getLearnedCaseIds(supabaseAdmin, learnerKey);
      if (!learnedIds.has(params.id) && learnedIds.size >= FREE_CASE_LIMIT) {
        return NextResponse.json(
          { error: `免费额度已用完（可学 ${FREE_CASE_LIMIT} 个病例），升级 Pro 解锁全部病例`, code: "FREE_LIMIT" },
          { status: 403 }
        );
      }

      await recordCaseOpened(supabaseAdmin, { caseId: params.id, userId, anonymousId: learnerId, ip });
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
