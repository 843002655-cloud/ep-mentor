/**
 * 统一存储层 — 为小程序移植准备
 * Web 端：使用 localStorage
 * 小程序端（移植时）：只需替换为 wx.setStorageSync / wx.getStorageSync 系列
 */

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage set failed:", e);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  getJSON<T>(key: string): T | null {
    const val = storage.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  },

  setJSON(key: string, value: unknown): void {
    storage.set(key, JSON.stringify(value));
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },
};

export default storage;

// 统一的 key 常量
export const STORAGE_KEYS = {
  AUTH_TOKEN: "ep_auth_token",
  USER_INFO: "ep_user_info",
  CHAT_HISTORY: "ep_chat_history",
  DAILY_USAGE: "ep_daily_usage",
  LAST_CASE_ID: "ep_last_case_id",
  PREFERENCES: "ep_preferences",
};
