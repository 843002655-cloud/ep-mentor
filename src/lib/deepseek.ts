import OpenAI from "openai";

/**
 * Shared DeepSeek client — use this instead of creating new OpenAI() in every route.
 * Falls back to deepseek-chat model and api.deepseek.com if env vars aren't set.
 */
export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
