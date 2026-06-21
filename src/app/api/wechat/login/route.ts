import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { exchangeWeChatCode, signInWeChatUser } from "@/lib/wechat-auth";
import { formatZodErrors, wechatLoginSchema } from "@/lib/validators";
import { supabaseAdmin } from "@/lib/supabase-server";

// POST /api/wechat/login — 小程序 wx.login(code) → Supabase JWT
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = wechatLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数错误", details: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const session = await exchangeWeChatCode(parsed.data.code);
    const login = await signInWeChatUser(session);

    await supabaseAdmin
      .from("analytics_events")
      .insert({
        event_type: "wechat_login",
        path: "/api/wechat/login",
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "",
        referrer: request.headers.get("referer") || "",
        user_id: login.user.id,
        session_id: `${ip}-${new Date().toISOString().split("T")[0]}`,
        metadata: { openid: session.openid },
      })
      .then(({ error }) => {
        if (error) console.error("wechat_login analytics:", error.message);
      });

    return NextResponse.json(login);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "微信登录失败";
    const status = message.includes("未配置") ? 503 : 401;
    console.error("POST /api/wechat/login:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
