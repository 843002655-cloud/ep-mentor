import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/request-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, messageIndex, feedback, figureIndex, epStep } = body;

    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ error: "缺少 caseId" }, { status: 400 });
    }
    if (feedback !== "up" && feedback !== "down") {
      return NextResponse.json({ error: "无效 feedback" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const cookieHeader = request.headers.get("cookie") || "";
    let userId: string | null = null;

    try {
      const { createServerClient } = await import("@supabase/ssr");
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () =>
              cookieHeader.split("; ").map((c) => {
                const [n, ...r] = c.split("=");
                return { name: n, value: r.join("=") };
              }),
            setAll() {},
          },
        }
      );
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    } catch {
      /* anonymous */
    }

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_type: "chat_feedback",
      path: `/cases/${caseId.slice(0, 36)}`,
      ip_address: ip,
      user_id: userId,
      session_id: `${ip}-${new Date().toISOString().split("T")[0]}`,
      metadata: {
        case_id: caseId.slice(0, 64),
        message_index: typeof messageIndex === "number" ? messageIndex : null,
        feedback,
        figure_index: typeof figureIndex === "number" ? figureIndex : null,
        ep_step: typeof epStep === "number" ? epStep : null,
      },
    });

    if (error) {
      console.error("Chat feedback insert error:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Chat feedback error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
