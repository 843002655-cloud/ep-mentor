// ── Quiz Service ─────────────────────────────────────────────────────
// 测验题库 API 请求

import { ROUTES } from "@/lib/routes";

interface QuizQuestion {
  id: string; question: string; options: string[];
  correct: number; explanation: string; category: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data as T;
}

export const quizService = {
  async getQuestions() {
    const data = await request<{ questions: QuizQuestion[] }>(
      ROUTES.API_QUIZ_QUESTIONS
    );
    return data.questions;
  },

  async createQuestion(q: Omit<QuizQuestion, "id">) {
    await request(ROUTES.API_QUIZ_QUESTIONS, {
      method: "POST", body: JSON.stringify(q),
    });
  },

  async updateQuestion(id: string, q: Partial<Omit<QuizQuestion, "id">>) {
    await request(ROUTES.API_QUIZ_QUESTION(id), {
      method: "PUT", body: JSON.stringify(q),
    });
  },

  async deleteQuestion(id: string) {
    await request(ROUTES.API_QUIZ_QUESTION(id), { method: "DELETE" });
  },
};
