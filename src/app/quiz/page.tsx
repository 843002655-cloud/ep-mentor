"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { SkeletonBox } from "@/components/Skeleton";

interface QuizQuestion { id: string; question: string; options: string[]; correct: number; explanation: string; category: string; }

const FALLBACK: QuizQuestion[] = [
  // SVT（6 题）
  { id: "fb1",  question: "关于 AVNRT（房室结折返性心动过速），以下哪项正确？", options: ["通常由房室旁路引起", "折返环位于房室结区域，慢-快型最常见", "心电图可见明显的 delta 波", "首选治疗是腺苷静脉推注，其他方法均无效"], correct: 1, explanation: "AVNRT 的折返环位于房室结区域，最常见的类型是慢-快型（slow-fast），占 80-90%。delta 波是预激综合征的特征。", category: "SVT" },
  { id: "fb3",  question: "关于预激综合征（WPW 综合征），以下哪项描述是正确的？", options: ["Delta 波由房室结加速传导引起", "旁路前传在心电图上表现为 delta 波和短 PR 间期", "所有 WPW 患者都需要导管消融", "腺苷是 WPW 合并房颤时的首选药物"], correct: 1, explanation: "旁路前向传导产生 delta 波，PR 间期缩短。无症状 WPW 需电生理评估危险分层，WPW 合并房颤禁用腺苷（可能诱发室颤）。", category: "SVT" },
  { id: "fb4",  question: "AVNRT 与 AVRT 的鉴别中，以下哪项最有诊断价值？", options: ["心率快慢", "QRS 波宽度", "RP 间期长短", "是否有房室分离"], correct: 2, explanation: "RP 间期最关键：短 RP（<70ms）多为典型 AVNRT，长 RP（>70ms）需考虑 AVRT（顺向型）或非典型 AVNRT。", category: "SVT" },
  { id: "fb18", question: "关于 Mahaim 纤维介导的心动过速，以下哪项正确？", options: ["心电图表现为 LBBB 形态的宽 QRS 心动过速", "通常为逆向型 AVRT", "Mahaim 纤维只有逆传功能", "最常见于左室游离壁"], correct: 0, explanation: "Mahaim 纤维是特殊的右侧旁路，只有前向递减传导功能（无逆传），介导心动过速呈 LBBB 形态。靶点在三尖瓣环的 Mahaim 电位。", category: "SVT" },
  { id: "fb12", question: "关于室上性心动过速的急性处理，以下哪项是维拉帕米的禁忌证？", options: ["窄 QRS 波心动过速", "宽 QRS 波心动过速而机制不明确", "AVNRT", "房性心动过速"], correct: 1, explanation: "宽 QRS 波心动过速在未明确机制前，禁忌维拉帕米——如果是 VT，可能导致严重低血压和血流动力学崩溃。按 VT 处理原则。", category: "SVT" },
  { id: "fb14", question: "关于希氏束旁旁路，以下哪项描述正确？", options: ["消融风险极低", "消融前需确认 His 电位并密切监测", "通常采用心外膜消融", "希氏束旁旁路无法消融"], correct: 1, explanation: "希氏束旁旁路消融有房室传导损伤风险。需在窦律下确认 His 电位，低能量起始，密切监测 PR 间期和交界心律。", category: "SVT" },
  // VT（5 题）
  { id: "fb5",  question: "以下哪项是特发性室速最常见的类型？", options: ["ARVC 相关 VT", "缺血性心肌病相关 VT", "右室流出道 VT（RVOT-VT）", "束支折返性 VT"], correct: 2, explanation: "RVOT-VT 是特发性 VT 最常见类型，约占 60-80%，通常为腺苷敏感性。心电图呈 LBBB 形态伴下壁导联高大 R 波。", category: "VT" },
  { id: "fb8",  question: "关于 ARVC 相关 VT，以下哪项描述错误？", options: ["心电图 epsilon 波是特征性表现", "VT 呈 LBBB 形态", "影像学可见右室脂肪浸润", "早期阶段左室功能通常严重受损"], correct: 3, explanation: "ARVC 早期主要表现为右室受累，左室功能通常保留。2010 Task Force 诊断标准需要 ≥2 项主要标准。", category: "VT" },
  { id: "fb9",  question: "关于流出道 VT 的标测与消融，以下哪项正确？", options: ["通常需心外膜途径", "最早激动点比 QRS 起始提前 30ms 以上", "起搏标测必须 12 导联完全匹配", "冷盐水灌注导管是必须的"], correct: 1, explanation: "流出道 VT 消融成功关键是在最早激动点消融，局部电位应比体表 QRS 起始提前 ≥30ms。", category: "VT" },
  { id: "fb11", question: "以下哪项心电图特征最有提示心外膜 VT 意义？", options: ["QRS 波时限 < 120ms", "胸前导联假性 delta 波 > 34ms", "心电轴正常", "V1 导联呈 rS 形态"], correct: 1, explanation: "心外膜 VT 特征：假性 delta 波 > 34ms、V2 类本位曲折时间延长、MDI > 0.55。心外膜消融需注意冠脉和膈神经。", category: "VT" },
  { id: "fb16", question: "关于流出道室早（PVC）消融靶点，以下哪项最准确？", options: ["起搏标测 8/12 匹配即可", "局部电位提前 20ms", "单极电图 QS 形态 + 双极最早激动", "放电后室早即刻增多说明部位错误"], correct: 2, explanation: "理想靶点：单极 QS 形态 + 双极最早激动（提前 >30ms）+ 起搏标测 12/12 最佳。放电后一过性增多往往提示靶点正确。", category: "VT" },
  // AF（5 题）
  { id: "fb2",  question: "房颤导管消融的主要靶点是？", options: ["房室结", "希氏束", "肺静脉", "冠状窦"], correct: 2, explanation: "肺静脉是房颤触发灶最常见来源，肺静脉隔离（PVI）是房颤导管消融的基石。", category: "AF" },
  { id: "fb10", question: "房颤消融术后 3 个月内发生房性心律失常，应如何处理？", options: ["立即二次消融", "视为空白期，药物控制 + 观察", "永久性起搏器植入", "立即电复律"], correct: 1, explanation: "术后 3 个月为空白期（blanking period），可能与消融灶炎症/水肿相关。推荐药物控制，3 个月后再评估。", category: "AF" },
  { id: "fb15", question: "关于房颤的节律控制 vs 心率控制，以下哪项符合最新指南？", options: ["所有房颤患者都应优先选择心率控制", "症状明显或心衰者，节律控制（含消融）优于单纯心率控制", "导管消融只适用于 65 岁以下", "心率控制目标为静息心率 < 60 bpm"], correct: 1, explanation: "EAST-AFNET 4 试验（2020）证实早期节律控制改善预后。2024 ESC 指南推荐症状性房颤/心衰者积极节律控制（I 类）。", category: "AF" },
  { id: "fb13", question: "以下哪种抗心律失常药在房颤合并 LVEF < 40% 时相对安全？", options: ["氟卡尼", "普罗帕酮", "胺碘酮", "索他洛尔"], correct: 2, explanation: "CAST 试验证实 I 类药物增加心梗后死亡率。胺碘酮在结构性心脏病中相对安全，不显著增加死亡率。", category: "AF" },
  { id: "fb20", question: "以下哪个 CHA₂DS₂-VASc 评分组合推荐启动抗凝？", options: ["男性 0 分（无危险因素）", "男性 ≥2 或女性 ≥3", "仅高血压一项", "所有房颤患者都应抗凝"], correct: 1, explanation: "2024 ESC 指南：男性 ≥2、女性 ≥3 推荐抗凝（I 类）；男性 =1、女性 =2 应考虑抗凝（IIa 类）。", category: "AF" },
  // AFL（3 题）
  { id: "fb6",  question: "典型心房扑动的折返环位于？", options: ["左心房后壁", "肺静脉口", "三尖瓣-下腔静脉峡部（CTI）", "冠状窦口"], correct: 2, explanation: "典型 AFL 折返环位于右心房三尖瓣-下腔静脉峡部（CTI），导管消融 CTI 线成功率 > 95%。", category: "AFL" },
  { id: "fb7",  question: "以下哪项不是典型心房扑动的特征？", options: ["下壁导联负向锯齿波", "心房率约 300 bpm", "折返环依赖 CTI", "P 波形态多变，至少有 3 种形态"], correct: 3, explanation: "P 波形态多变是房性心动过速的特征，不是典型 AFL。典型 AFL 的 F 波形态规则、下壁导联锯齿状。", category: "AFL" },
  { id: "fb17", question: "关于 CTI 消融的终点，以下哪项是最严格标准？", options: ["消融过程中房扑终止", "CS 激动时间 > 100ms", "CTI 双向阻滞（bidirectional block）", "消融线两侧电压 < 0.1mV"], correct: 2, explanation: "CTI 双向阻滞是标准终点——起搏 CS 近端时低位右房侧壁激动由下向上，起搏低位右房时 CS 激动由近到远。仅房扑终止不足。", category: "AFL" },
  // 综合（3 题）
  { id: "fb19", question: "关于电生理拖带（entrainment）标测，以下哪项正确？", options: ["拖带只能在窦性心律下完成", "隐匿性融合提示起搏部位在折返环内", "PPI-TCL > 30ms 提示起搏部位在折返环内", "拖带不能用于房扑标测"], correct: 1, explanation: "隐匿性融合是判断起搏部位在折返环内的关键——起搏不改变心动过速激动顺序和形态。PPI-TCL < 30ms 提示在折返环内。", category: "综合" },
  { id: "fb21", question: "关于 Brugada 综合征，以下哪项正确？", options: ["心电图呈 LBBB 形态", "右胸导联 ST 段抬高，与 SCN5A 基因突变相关", "通常由缺血性心肌病引起", "首选治疗是 β 受体阻滞剂"], correct: 1, explanation: "Brugada 综合征特征：右胸导联（V1-V3）ST 段抬高，最常见与 SCN5A 突变相关。ICD 是高危患者的一线治疗。", category: "综合" },
  { id: "fb22", question: "心脏电生理检查中，His 束电位的正常 HV 间期为？", options: ["10-20 ms", "35-55 ms", "80-120 ms", "150-200 ms"], correct: 1, explanation: "HV 间期正常范围 35-55 ms，代表从 His 束到心室肌的传导时间。HV > 100 ms 提示希浦系统病变。", category: "综合" },
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
    import("@/lib/services").then(({ quizService }) => {
      quizService.getQuestions().then((qs) => {
        setQuestions(qs?.length ? qs : FALLBACK); setLoading(false);
      }).catch(() => { setQuestions(FALLBACK); setLoading(false); });
    });
  }, []);

  if (loading) return <AppLayout><div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><SkeletonBox className="h-8 w-48 mb-2" /><SkeletonBox className="h-5 w-64 mb-8" /><div className="card"><SkeletonBox className="h-5 w-16 rounded-full mb-4" /><SkeletonBox className="h-6 w-3/4 mb-6" /><div className="space-y-3 mb-6">{Array.from({length:4}).map((_,i)=><SkeletonBox key={i} className="h-12 w-full rounded-lg" />)}</div><SkeletonBox className="h-10 w-24 rounded-lg" /></div></div></AppLayout>;
  if (!questions.length) return <AppLayout><div className="max-w-3xl mx-auto px-4 py-12 text-center text-[#6B7F96] dark:text-slate-400">暂无题目</div></AppLayout>;

  const q = questions[currentQ];
  const handleSubmit = () => { if (selected === null) return; setSubmitted(true); if (selected === q.correct) setScore((s) => s + 1); };
  const handleNext = () => {
    if (currentQ + 1 < questions.length) { setCurrentQ(currentQ + 1); setSelected(null); setSubmitted(false); }
    else setFinished(true);
  };
  const handleRestart = () => { setCurrentQ(0); setSelected(null); setSubmitted(false); setScore(0); setFinished(false); };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">知识测验</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-8">巩固你的电生理知识（共 {questions.length} 题）</p>

        {finished ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">{score >= questions.length * 0.8 ? "🎉" : score >= questions.length * 0.5 ? "👍" : "📚"}</div>
            <h2 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">测验完成！</h2>
            <p className="text-lg text-[#6B7F96] dark:text-slate-400 mb-6">得分：{score} / {questions.length}（{Math.round((score / questions.length) * 100)}%）</p>
            <button onClick={handleRestart} className="btn-primary">重新测验</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-[#8FA0B4] dark:text-slate-500">第 {currentQ + 1} / {questions.length} 题</span>
              <div className="flex-1 h-2 bg-[#E8ECF0] dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#1B4F8A] dark:bg-blue-600 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
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
              : <button onClick={handleNext} className="btn-primary">{currentQ + 1 < questions.length ? "下一题" : "查看结果"}</button>}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
