import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin-email";
import { checkRateLimit } from "@/lib/rate-limit";

/** 从 cookie 获取服务端 Supabase 客户端 */
export function getServerSupabase(cookieHeader: string) {
  return createServerClient(
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
}

/** 检查当前请求的用户是否为管理员 */
export async function isAdmin(cookieHeader: string): Promise<boolean> {
  const supabase = getServerSupabase(cookieHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminEmail = getAdminEmail();
  return !!adminEmail && user.email === adminEmail;
}

/** Admin API 路由鉴权 + 限流，通过返回 null，拒绝返回 Response */
export async function requireAdminApi(request: NextRequest): Promise<NextResponse | null> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }
  const cookieHeader = request.headers.get("cookie") || "";
  if (!(await isAdmin(cookieHeader))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  return null;
}

/** 获取当前用户 ID，未登录返回 null */
export async function getUserId(cookieHeader: string): Promise<string | null> {
  const supabase = getServerSupabase(cookieHeader);
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/** 检查是否登录，未登录返回 401 */
export async function requireAuth(cookieHeader: string): Promise<{
  userId: string;
  supabase: ReturnType<typeof getServerSupabase>;
} | null> {
  const supabase = getServerSupabase(cookieHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, supabase };
}
