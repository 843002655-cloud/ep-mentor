/**
 * 微信小程序登录 API — 预留接口
 *
 * 移植小程序时取消注释，填入你的微信 AppID 和 AppSecret：
 *
 * POST /api/wechat/login
 * Body: { code: string }
 * Response: { access_token, refresh_token, user }
 */

import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  // ── 移植时取消注释以下代码 ──────────────────────────────────────
  //
  // const { code } = await request.json();
  //
  // if (!code) {
  //   return NextResponse.json({ error: "缺少登录 code" }, { status: 400 });
  // }
  //
  // const appId = process.env.WECHAT_APP_ID;
  // const appSecret = process.env.WECHAT_APP_SECRET;
  //
  // if (!appId || !appSecret) {
  //   return NextResponse.json(
  //     { error: "微信登录未配置" },
  //     { status: 501 }
  //   );
  // }
  //
  // // 1. 用 code 换取 openid 和 session_key
  // const wxRes = await fetch(
  //   `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
  // );
  // const wxData = await wxRes.json();
  //
  // if (wxData.errcode) {
  //   return NextResponse.json(
  //     { error: `微信登录失败: ${wxData.errmsg}` },
  //     { status: 400 }
  //   );
  // }
  //
  // const { openid, unionid } = wxData;
  //
  // // 2. 在 Supabase 中查找或创建用户
  // //    - 用 openid 作为唯一标识
  // //    - 可以通过 Supabase Admin API 创建自定义 token
  //
  // // 3. 生成 Supabase JWT 返回
  // return NextResponse.json({
  //   access_token: "...",
  //   refresh_token: "...",
  //   user: { openid, unionid },
  // });
  //
  // ──────────────────────────────────────────────────────────────────

  return NextResponse.json(
    {
      error: "微信登录接口尚未配置",
      message:
        "请在移植小程序时配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 环境变量，并取消此文件的注释。",
    },
    { status: 501 }
  );
}
