import { supabaseAdmin } from "@/lib/supabase-server";

export type AdminAnalytics = {
  pv: number;
  uv: number;
  registrations: number;
  totalChats: number;
  caseCompletions: number;
  pages: [string, number][];
  avgDurations: Record<string, number>;
  dailyTrend: [string, number][];
  days: number;
};

const ALLOWED_DAYS = [7, 30, 90] as const;

export function parseAnalyticsDays(raw: string | undefined): number {
  const n = parseInt(raw || "7", 10);
  return (ALLOWED_DAYS as readonly number[]).includes(n) ? n : 7;
}

async function countRegistrationsSince(since: Date): Promise<number> {
  const sinceIso = since.toISOString();
  let count = 0;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) break;

    for (const user of data.users) {
      if (user.created_at && user.created_at >= sinceIso) count++;
    }

    if (data.users.length < 1000) break;
    page++;
  }

  return count;
}

export async function fetchAdminAnalytics(days: number): Promise<AdminAnalytics> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.split("T")[0];

  const [
    { count: pv },
    { data: uvData },
    { data: pageRows },
    { data: exits },
    { data: dailyRows },
    { data: usageData },
    { count: caseCompletions },
  ] = await Promise.all([
    supabaseAdmin
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("analytics_events")
      .select("session_id, ip_address")
      .eq("event_type", "page_view")
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("analytics_events")
      .select("path")
      .eq("event_type", "page_view")
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("analytics_events")
      .select("path, duration_ms")
      .eq("event_type", "page_exit")
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "page_view")
      .gte("created_at", sinceIso),
    supabaseAdmin.from("usage_logs").select("chat_count").gte("date", sinceDate),
    supabaseAdmin
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "case_complete")
      .gte("created_at", sinceIso),
  ]);

  const uniqueVisitors = new Set(
    (uvData || []).map((r) => r.session_id || r.ip_address).filter(Boolean)
  );

  const pageCounts: Record<string, number> = {};
  for (const row of pageRows || []) {
    pageCounts[row.path] = (pageCounts[row.path] || 0) + 1;
  }

  const pageDurations: Record<string, { total: number; count: number }> = {};
  for (const row of exits || []) {
    if (!pageDurations[row.path]) pageDurations[row.path] = { total: 0, count: 0 };
    pageDurations[row.path].total += row.duration_ms || 0;
    pageDurations[row.path].count += 1;
  }

  const avgDurations: Record<string, number> = {};
  for (const [path, d] of Object.entries(pageDurations)) {
    if (d.count > 0) avgDurations[path] = Math.round(d.total / d.count / 1000);
  }

  const dailyCounts: Record<string, number> = {};
  for (const row of dailyRows || []) {
    const day = row.created_at.split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }

  const totalChats = (usageData || []).reduce((sum, row) => sum + (row.chat_count || 0), 0);
  const registrations = await countRegistrationsSince(since);

  return {
    pv: pv || 0,
    uv: uniqueVisitors.size,
    registrations,
    totalChats,
    caseCompletions: caseCompletions || 0,
    pages: Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    avgDurations,
    dailyTrend: Object.entries(dailyCounts).sort(),
    days,
  };
}
