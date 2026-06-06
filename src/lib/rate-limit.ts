/**
 * 简易 API 频率限制器（内存版本）
 * 防止内容被批量爬取
 *
 * 生产环境建议替换为 Redis 版本或使用 Cloudflare Rate Limiting
 */

const requestLog = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 分钟窗口
const MAX_REQUESTS = 60;   // 每个 IP 每分钟最多 60 次请求

/** 检查是否超过频率限制 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || now > entry.resetAt) {
    requestLog.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

/** 定期清理过期记录 */
setInterval(() => {
  const now = Date.now();
  Array.from(requestLog.entries()).forEach(([ip, entry]) => {
    if (now > entry.resetAt) requestLog.delete(ip);
  });
}, 300_000); // 每 5 分钟清理一次
