"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  category: string;
}

const FALLBACK: QuizQuestion[] = [
  { id: "fb1", question: "关于 AVNRT，以下哪项正确？", options: ["由房室旁路引起", "折返环在房室结区域，慢快型最常见", "可见 delta 波", "治疗仅限腺苷"], correct: 1, explanation: "AVNRT 折返环在房室结，慢快型占 80-90%。", category: "SVT" },
  { id: "fb2", question: "房颤导管消融主要靶点？", options: ["房室结", "希氏束", "肺静脉", "冠状窦"], correct: 2, explanation: "肺静脉是房颤触发灶最常见来源。", category: "AF" },
  { id: "fb3", question: "典型心房扑动（AFL）的折返环位于？", options: ["左心房后壁", "肺静脉口", "三尖瓣-下腔静脉峡部", "冠状窦口"], correct: 2, explanation: "典型 AFL 折返环位于右心房三尖瓣-下腔静脉峡部（CTI），导管消融成功率 > 95%。", category: "AFL" },
  { id: "fb4", question: "最常见特发性 VT 类型？", options: ["ARVC 相关 VT", "缺血性 VT", "RVOT-VT", "束支折返性 VT"], correct: 2, explanation: "RVOT-VT 占特发性 VT 的 60-80%。", category: "VT" },
  { id: "fb5", question: "正常 HV 间期范围？", options: ["10-20 ms", "35-55 ms", "80-120 ms", "150-200 ms"], correct: 1, explanation: "HV 间期正常 35-55ms。", category: "SVT" },
];

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetch("/api/quiz-questions")
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions?.length ? data.questions : FALLBACK);
        setLoading(false);
      })
      .catch(() => { setQuestions(FALLBACK); setLoading(false); });
  }, []);

  if (loading) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-12 text-center text-ep-muted">加载题库中...</div></AppLayout>;
  if (!questions.length) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-12 text-center text-ep-muted">暂无题目</div></AppLayout>;

  const q = questions[currentQ];

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    if (selected === q.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentQ + 1 < questions.length) { setCurrentQ(currentQ + 1); setSelected(null); setSubmitted(false); }
    else setFinished(true);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">知识测验</h1>
        <p className="text-ep-muted mb-8">巩固你的电生理知识（共 {questions.length} 题）</p>

        {finished ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">{score >= questions.length * 0.8 ? "🎉" : score >= questions.length * 0.5 ? "👍" : "📚"}</div>
            <h2 className="text-2xl font-bold text-white mb-2">测验完成！</h2>
            <p className="text-lg text-ep-muted mb-6">得分：{score} / {questions.length}（{Math.round((score / questions.length) * 100)}%）</p>
            <button onClick={() => { setCurrentQ(0); setSelected(null); setSubmitted(false); setScore(0); setFinished(false); }} className="btn-primary">重新测验</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-ep-muted">第 {currentQ + 1} / {questions.length} 题</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-ep-primary rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>
            <div className="card">
              <span className="badge-category bg-ep-primary/20 text-ep-primary mb-3 inline-block">{q.category}</span>
              <h2 className="text-xl font-semibold text-white mb-6">{q.question}</h2>
              <div className="space-y-3 mb-6">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      submitted && i === q.correct ? "border-diff-basic bg-diff-basic/10 text-diff-basic"
                      : submitted && i === selected && i !== q.correct ? "border-diff-advanced bg-diff-advanced/10 text-diff-advanced"
                      : selected === i ? "border-ep-primary bg-ep-primary/10 text-white"
                      : "border-slate-600 text-ep-muted hover:border-slate-500"
                    }`}>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                ))}
              </div>
              {submitted && <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6"><p className="text-sm text-white">{q.explanation}</p></div>}
              {!submitted ? (
                <button onClick={handleSubmit} disabled={selected === null} className="btn-primary disabled:opacity-50">提交答案</button>
              ) : (
                <button onClick={handleNext} className="btn-primary">{currentQ + 1 < questions.length ? "下一题" : "查看结果"}</button>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
