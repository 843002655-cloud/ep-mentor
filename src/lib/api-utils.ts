import { createServerClient } from "@supabase/ssr";

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
  return user.email === process.env.ADMIN_EMAIL;
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
