import { createHash, createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface WeChatSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

export interface WeChatLoginResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

function getLoginSecret(): string {
  return (
    process.env.WECHAT_LOGIN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "ep-mentor-wechat-fallback-secret"
  );
}

export function wechatEmailForOpenid(openid: string): string {
  const hash = createHash("sha256").update(openid).digest("hex").slice(0, 24);
  return `wx_${hash}@wechat.ep-mentor.local`;
}

export function wechatPasswordForOpenid(openid: string): string {
  return createHmac("sha256", getLoginSecret()).update(openid).digest("hex").slice(0, 32);
}

export async function exchangeWeChatCode(code: string): Promise<WeChatSession> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("WECHAT_APP_ID / WECHAT_APP_SECRET 未配置");
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    openid?: string;
    session_key?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (!data.openid || !data.session_key) {
    throw new Error(data.errmsg || `微信登录失败 (${data.errcode ?? "unknown"})`);
  }

  return {
    openid: data.openid,
    session_key: data.session_key,
    unionid: data.unionid,
  };
}

async function findUserIdByWeChatOpenid(openid: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("wechat_openid", openid)
    .maybeSingle();

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("does not exist") || lower.includes("wechat_openid")) {
      return null;
    }
    console.error("findUserIdByWeChatOpenid:", error.message);
  }

  return data?.id ?? null;
}

async function upsertWeChatProfile(userId: string, session: WeChatSession): Promise<void> {
  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      wechat_openid: session.openid,
      wechat_unionid: session.unionid ?? null,
      plan: "free",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("does not exist")) return;
    console.error("upsertWeChatProfile:", error.message);
  }
}

async function ensureWeChatUser(session: WeChatSession): Promise<string> {
  const existingId = await findUserIdByWeChatOpenid(session.openid);
  if (existingId) return existingId;

  const email = wechatEmailForOpenid(session.openid);
  const password = wechatPasswordForOpenid(session.openid);

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      provider: "wechat",
      wechat_openid: session.openid,
      wechat_unionid: session.unionid ?? null,
    },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw new Error(createError.message);
  }

  const userId = created?.user?.id;
  if (!userId) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signInData.user) {
      throw new Error(signInError?.message || "微信用户登录失败");
    }
    await upsertWeChatProfile(signInData.user.id, session);
    return signInData.user.id;
  }

  await upsertWeChatProfile(userId, session);
  return userId;
}

export async function signInWeChatUser(session: WeChatSession): Promise<WeChatLoginResult> {
  await ensureWeChatUser(session);

  const email = wechatEmailForOpenid(session.openid);
  const password = wechatPasswordForOpenid(session.openid);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message || "创建登录会话失败");
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in ?? 3600,
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata as Record<string, unknown>,
    },
  };
}
