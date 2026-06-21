/** Allowed client-side analytics event types */
export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "page_exit",
  "register",
  "case_complete",
  "wechat_login",
  "chat_feedback",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

const ALLOWED = new Set<string>(ANALYTICS_EVENT_TYPES);

export function isAllowedAnalyticsEvent(eventType: unknown): eventType is AnalyticsEventType {
  return typeof eventType === "string" && ALLOWED.has(eventType);
}

export function sanitizeAnalyticsPath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/")) return "/";
  return path.slice(0, 500);
}

export function sanitizeAnalyticsMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 64) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = typeof value === "string" ? value.slice(0, 500) : value;
    }
  }
  return out;
}
