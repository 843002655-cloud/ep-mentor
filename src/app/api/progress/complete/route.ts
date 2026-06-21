import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";
import { recordCaseLearned } from "@/lib/learner-stats";
import { checkRateLimit } from "@/lib/rate-limit";
import { isEpMentorCase } from "@/lib/case-product";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
    }

    const { caseId, anonymousId } = await request.json();
    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ error: "缺少 caseId" }, { status: 400 });
    }

    const { data: caseRow, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("id, is_published, content_json")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "病例不存在" }, { status: 404 });
    }

    if (!isEpMentorCase(caseRow.content_json as Record<string, unknown> | undefined)) {
      return NextResponse.json({ error: "病例不存在" }, { status: 404 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split("; ").map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await recordCaseLearned(supabaseAdmin, {
      caseId,
      userId: user?.id || null,
      anonymousId: typeof anonymousId === "string" ? anonymousId : "",
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/progress/complete error:", error);
    return NextResponse.json({ error: "记录失败" }, { status: 500 });
  }
}
