import type { SupabaseClient } from "@supabase/supabase-js";

export function buildLearnerKey(userId: string | null, anonymousId: string, ip: string): string {
  if (userId) return `user:${userId}`;
  if (anonymousId) return `anon:${anonymousId}`;
  const today = new Date().toISOString().split("T")[0];
  return `ip:${ip}-${today}`;
}

async function hasExistingCompletion(
  supabase: SupabaseClient,
  caseId: string,
  learnerKey: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "case_complete")
    .eq("metadata->>case_id", caseId)
    .eq("metadata->>learner_key", learnerKey);

  if (error) {
    console.error("hasExistingCompletion error:", error.message);
    return true;
  }
  return (count || 0) > 0;
}

export async function recordCaseLearned(
  supabase: SupabaseClient,
  opts: { caseId: string; userId: string | null; anonymousId: string; ip: string }
): Promise<void> {
  const learnerKey = buildLearnerKey(opts.userId, opts.anonymousId, opts.ip);
  const completedAt = new Date().toISOString();

  const exists = await hasExistingCompletion(supabase, opts.caseId, learnerKey);
  if (!exists) {
    const { error: eventError } = await supabase.from("analytics_events").insert({
      event_type: "case_complete",
      path: `/cases/${opts.caseId}`,
      ip_address: opts.ip,
      user_id: opts.userId,
      session_id: learnerKey,
      metadata: { case_id: opts.caseId, learner_key: learnerKey },
    });
    if (eventError) {
      console.error("case_complete event error:", eventError.message);
    }
  }

  if (opts.userId) {
    const { error: progressError } = await supabase.from("user_progress").upsert(
      { user_id: opts.userId, case_id: opts.caseId, completed_at: completedAt, score: 0 },
      { onConflict: "user_id,case_id" }
    );
    if (progressError) {
      console.error("user_progress upsert error:", progressError.message);
    }
  }
}

export async function fetchLearnerCounts(
  supabase: SupabaseClient,
  caseIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (caseIds.length === 0) return counts;

  const caseIdSet = new Set(caseIds);
  const learnersByCase = new Map<string, Set<string>>();

  const addLearner = (caseId: string, key: string) => {
    if (!caseIdSet.has(caseId)) return;
    if (!learnersByCase.has(caseId)) learnersByCase.set(caseId, new Set());
    learnersByCase.get(caseId)!.add(key);
  };

  const { data: events, error: eventsError } = await supabase
    .from("analytics_events")
    .select("metadata, user_id, session_id")
    .eq("event_type", "case_complete")
    .in("metadata->>case_id", caseIds);

  if (eventsError) {
    console.error("fetchLearnerCounts events error:", eventsError.message);
  } else {
    for (const row of events || []) {
      const meta = row.metadata as { case_id?: string; learner_key?: string } | null;
      const caseId = meta?.case_id;
      const key = meta?.learner_key || row.user_id || row.session_id;
      if (caseId && key) addLearner(caseId, String(key));
    }
  }

  const { data: progress, error: progressError } = await supabase
    .from("user_progress")
    .select("case_id, user_id")
    .in("case_id", caseIds);

  if (progressError) {
    console.error("fetchLearnerCounts progress error:", progressError.message);
  } else {
    for (const row of progress || []) {
      addLearner(row.case_id as string, `user:${row.user_id}`);
    }
  }

  learnersByCase.forEach((learners, caseId) => {
    counts[caseId] = learners.size;
  });
  return counts;
}
