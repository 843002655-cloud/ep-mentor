/** 统一管理员邮箱配置（服务端与客户端共用逻辑） */
export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
}

export function getSupabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  return ref ? `sb-${ref}-auth-token` : "supabase.auth.token";
}
