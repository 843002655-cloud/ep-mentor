"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { SkeletonBox } from "@/components/Skeleton";
import type { QuizQuestion } from "@/lib/quiz-data";

const QUIZ_SIZE = 5; // 每轮题目数

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const startQuiz = (pool: QuizQuestion[]) => {
    const picked = shuffle(pool).slice(0, QUIZ_SIZE);
    setQuestions(picked);
  };

  useEffect(() => {
    Promise.all([
      import("@/lib/quiz-data"),
      import("@/lib/services"),
    ]).then(([quizData, { quizService }]) => {
      const FALLBACK = quizData.default;
      quizService.getQuestions().then((qs) => {
        const pool = qs?.length ? qs : FALLBACK;
        setAllQuestions(pool);
        startQuiz(pool);
        setLoading(false);
      }).catch(() => {
        setAllQuestions(FALLBACK);
        startQuiz(FALLBACK);
        setLoading(false);
      });
    });
  }, []);

  if (loading) return <AppLayout><div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><SkeletonBox className="h-8 w-48 mb-2" /><SkeletonBox className="h-5 w-64 mb-8" /><div className="card"><SkeletonBox className="h-5 w-16 rounded-full mb-4" /><SkeletonBox className="h-6 w-3/4 mb-6" /><div className="space-y-3 mb-6">{Array.from({length:4}).map((_,i)=><SkeletonBox key={i} className="h-12 w-full rounded-lg" />)}</div><SkeletonBox className="h-10 w-24 rounded-lg" /></div></div></AppLayout>;
  if (!questions.length) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-12 text-center text-[#6B7F96] dark:text-slate-400">暂无题目</div></AppLayout>;

  const q = questions[currentQ];
  const handleSubmit = () => { if (selected === null) return; setSubmitted(true); if (selected === q.correct) setScore((s) => s + 1); };
  const handleNext = () => {
    if (currentQ + 1 < QUIZ_SIZE) { setCurrentQ(currentQ + 1); setSelected(null); setSubmitted(false); }
    else setFinished(true);
  };
  const handleRestart = () => { setCurrentQ(0); setSelected(null); setSubmitted(false); setScore(0); setFinished(false); startQuiz(allQuestions); };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">知识测验</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-8">巩固你的电生理知识 · 每轮 {QUIZ_SIZE} 题 · 题库 {allQuestions.length} 题</p>

        {finished ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">{score >= 4 ? "🎉" : score >= 3 ? "👍" : "📚"}</div>
            <h2 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">测验完成！</h2>
            <p className="text-lg text-[#6B7F96] dark:text-slate-400 mb-6">得分：{score} / {QUIZ_SIZE}（{Math.round((score / QUIZ_SIZE) * 100)}%）</p>
            <button onClick={handleRestart} className="btn-primary">重新测验</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-[#8FA0B4] dark:text-slate-500">第 {currentQ + 1} / {QUIZ_SIZE} 题</span>
              <div className="flex-1 h-2 bg-[#E8ECF0] dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#1B4F8A] dark:bg-blue-600 rounded-full transition-all" style={{ width: `${((currentQ + 1) / QUIZ_SIZE) * 100}%` }} />
              </div>
            </div>
            <div className="card">
              <span className="badge-category bg-[#EBF2FA] dark:bg-blue-900/30 text-[#1B4F8A] dark:text-blue-300 mb-3 inline-block">{q.category}</span>
              <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-6 font-serif">{q.question}</h2>
              <div className="space-y-3 mb-6">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      submitted && i === q.correct ? "border-[#0F6E56] dark:border-emerald-400 bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300"
                      : submitted && i === selected && i !== q.correct ? "border-[#9B2C2C] dark:border-red-400 bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300"
                      : selected === i ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400"
                      : "border-[#C5D3E0] dark:border-slate-600 text-[#3D5166] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400"
                    }`}>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                ))}
              </div>
              {submitted && <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-lg p-4 mb-6"><p className="text-sm text-[#3D5166] dark:text-slate-300">{q.explanation}</p></div>}
              {!submitted ? <button onClick={handleSubmit} disabled={selected === null} className="btn-primary disabled:opacity-50">提交答案</button>
              : <button onClick={handleNext} className="btn-primary">{currentQ + 1 < QUIZ_SIZE ? "下一题" : "查看结果"}</button>}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
