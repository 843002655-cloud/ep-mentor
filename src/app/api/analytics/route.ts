import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import {
  isAllowedAnalyticsEvent,
  sanitizeAnalyticsMetadata,
  sanitizeAnalyticsPath,
} from "@/lib/analytics-events";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
    }

    const body = await request.json();
    const { event_type, path, duration_ms, metadata } = body;

    if (!isAllowedAnalyticsEvent(event_type)) {
      return NextResponse.json({ error: "无效的事件类型" }, { status: 400 });
    }

    const safePath = sanitizeAnalyticsPath(path);
    const safeMetadata = sanitizeAnalyticsMetadata(metadata);
    const duration =
      typeof duration_ms === "number" && duration_ms >= 0 && duration_ms <= 86_400_000
        ? Math.round(duration_ms)
        : null;

    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

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

    const today = new Date().toISOString().split("T")[0];
    const sessionId = `${ip}-${today}`;

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_type,
      path: safePath,
      ip_address: ip,
      user_agent: userAgent.slice(0, 500),
      referrer: referrer.slice(0, 500),
      user_id: userId,
      session_id: sessionId,
      duration_ms: duration,
      metadata: safeMetadata,
    });

    if (error) {
      console.error("Analytics insert error:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
