/** 只允许站内相对路径，防止开放重定向 */
export function sanitizeRedirectPath(
  next: string | null | undefined,
  fallback = "/cases"
): string {
  if (!next) return fallback;
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("@")
  ) {
    return fallback;
  }
  return next;
}
