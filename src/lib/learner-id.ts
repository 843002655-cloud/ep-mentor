const STORAGE_KEY = "app_learner_id";

/** 匿名学员持久 ID，两个项目共用同一 key（共享 Supabase） */
export function getOrCreateLearnerId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
