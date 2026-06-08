"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";

/* ── EP Calculator Components ──────────────────────────────────── */

function QTcCalculator() {
  const [qt, setQt] = useState<number>(400);
  const [rr, setRr] = useState<number>(800);
  const qtc = rr > 0 ? Math.round(qt / Math.sqrt(rr / 1000) * 10) / 10 : 0;
  const status = qtc > 460 ? "⚠️ 延长" : qtc < 340 ? "⬇️ 缩短" : "✅ 正常";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#6B7F96] dark:text-slate-400 mb-1">QT 间期 (ms)</label>
          <input type="number" value={qt} onChange={(e) => setQt(Number(e.target.value) || 0)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-[#6B7F96] dark:text-slate-400 mb-1">RR 间期 (ms)</label>
          <input type="number" value={rr} onChange={(e) => setRr(Number(e.target.value) || 0)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400" />
        </div>
      </div>
      <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 text-center">
        <p className="text-xs text-[#6B7F96] dark:text-slate-400">校正 QTc (Bazett)</p>
        <p className="text-3xl font-bold text-[#1B4F8A] dark:text-blue-400 font-mono">{qtc} ms</p>
        <p className="text-sm mt-1 text-[#3D5166] dark:text-slate-300">{status}</p>
        <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-1">正常范围：340–460 ms</p>
      </div>
    </div>
  );
}

function ChadVascCalculator() {
  const factors = [
    { key: "chf", label: "充血性心衰 / LVEF ≤ 40%", points: 1 },
    { key: "htn", label: "高血压", points: 1 },
    { key: "age75", label: "年龄 ≥ 75 岁", points: 2 },
    { key: "dm", label: "糖尿病", points: 1 },
    { key: "stroke", label: "卒中/TIA/体循环栓塞史", points: 2 },
    { key: "vasc", label: "血管疾病（心梗/PAD/主动脉斑块）", points: 1 },
    { key: "age65", label: "年龄 65–74 岁", points: 1 },
    { key: "female", label: "女性", points: 1 },
  ];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (k: string) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const total = Array.from(selected).reduce((sum, k) => sum + (factors.find((f) => f.key === k)?.points || 0), 0);
  const recommendation = total >= 2 ? "推荐抗凝（NOAC 或华法林）" : total === 1 ? "考虑抗凝（可评估出血风险后决定）" : "无需抗凝";
  return (
    <div className="space-y-3">
      {factors.map((f) => (
        <label key={f.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${selected.has(f.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700" : "border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400"}`}>
          <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} className="sr-only" />
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected.has(f.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#1B4F8A] dark:bg-blue-600" : "border-[#C5D3E0] dark:border-slate-600"}`}>
            {selected.has(f.key) && <span className="text-white text-xs">✓</span>}
          </span>
          <span className="text-sm text-[#3D5166] dark:text-slate-300 flex-1">{f.label}</span>
          <span className="text-xs font-bold text-[#1B4F8A] dark:text-blue-400">+{f.points}</span>
        </label>
      ))}
      <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 text-center">
        <p className="text-xs text-[#6B7F96] dark:text-slate-400">CHA₂DS₂-VASc 评分</p>
        <p className="text-3xl font-bold text-[#1B4F8A] dark:text-blue-400 font-mono">{total} 分</p>
        <p className="text-sm mt-1 text-[#3D5166] dark:text-slate-300">{recommendation}</p>
      </div>
    </div>
  );
}

function HasBledCalculator() {
  const factors = [
    { key: "htn", label: "高血压（SBP > 160 mmHg）", points: 1 },
    { key: "renal", label: "肾功能异常（透析/移植/Cr > 200）", points: 1 },
    { key: "liver", label: "肝功能异常（肝硬化/胆红素 > 2×）", points: 1 },
    { key: "bleed", label: "出血史或贫血", points: 1 },
    { key: "inr", label: "INR 不稳定（TTR < 60%）", points: 1 },
    { key: "age", label: "年龄 > 65 岁", points: 1 },
    { key: "drugs", label: "抗血小板药/NSAIDs 合用", points: 1 },
    { key: "alcohol", label: "酗酒（≥ 8 杯/周）", points: 1 },
  ];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (k: string) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const total = selected.size;
  const risk = total >= 3 ? "🔴 高危 — 谨慎抗凝，需密切监测" : total >= 1 ? "🟡 中危 — 定期评估" : "🟢 低危 — 可安全抗凝";
  return (
    <div className="space-y-3">
      {factors.map((f) => (
        <label key={f.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${selected.has(f.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700" : "border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400"}`}>
          <input type="checkbox" checked={selected.has(f.key)} onChange={() => toggle(f.key)} className="sr-only" />
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected.has(f.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#1B4F8A] dark:bg-blue-600" : "border-[#C5D3E0] dark:border-slate-600"}`}>
            {selected.has(f.key) && <span className="text-white text-xs">✓</span>}
          </span>
          <span className="text-sm text-[#3D5166] dark:text-slate-300 flex-1">{f.label}</span>
          <span className="text-xs font-bold text-[#1B4F8A] dark:text-blue-400">+{f.points}</span>
        </label>
      ))}
      <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 text-center">
        <p className="text-xs text-[#6B7F96] dark:text-slate-400">HAS-BLED 评分</p>
        <p className="text-3xl font-bold text-[#1B4F8A] dark:text-blue-400 font-mono">{total} 分</p>
        <p className="text-sm mt-1 text-[#3D5166] dark:text-slate-300">{risk}</p>
      </div>
    </div>
  );
}

/* ── Drug Reference Panel ─────────────────────────────────────── */

const drugRef = [
  { drug: "腺苷", dose: "6 mg → 12 mg → 18 mg", note: "快速静推 + 盐水冲管，半衰期 < 10s" },
  { drug: "伊布利特", dose: "1 mg (≥60kg) 或 0.01 mg/kg (<60kg)", note: "10 分钟静推，监测 QT 间期 ≥ 4h" },
  { drug: "维拉帕米", dose: "5–10 mg", note: "缓慢静推 2min，监测血压" },
  { drug: "异丙肾", dose: "0.5–2 μg/min 输注", note: "用于诱发或验证消融终点" },
  { drug: "肝素", dose: "ACT 300–350s（消融时）", note: "首剂 100 U/kg，每 30min 追加" },
];

const electrodeRef = [
  { spacing: "1 mm", voltage: "0.5–1.5 mV", usage: "近场电位" },
  { spacing: "2 mm", voltage: "1.0–3.0 mV", usage: "记录 His 电位" },
  { spacing: "5 mm", voltage: "2.0–5.0 mV", usage: "CS 电极记录" },
  { spacing: "10 mm", voltage: "3.0–10.0 mV", usage: "Halo 电极" },
];

/* ── Main Page ─────────────────────────────────────────────────── */

export default function ToolsPage() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">EP 工具库</h1>
        <p className="text-[#6B7F96] dark:text-slate-400 mb-8">电生理临床常用计算器与参考工具</p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* QTc */}
          <div className="card">
            <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📐 QTc 计算器</h2>
            <QTcCalculator />
          </div>

          {/* CHA2DS2-VASc */}
          <div className="card">
            <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📋 CHA₂DS₂-VASc 评分</h2>
            <ChadVascCalculator />
          </div>

          {/* HAS-BLED */}
          <div className="card">
            <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">🩸 HAS-BLED 评分</h2>
            <HasBledCalculator />
          </div>

          {/* Conduction velocity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📏 电极间距与电压参考</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[#E8ECF0] dark:border-slate-700">
                    <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">电极间距</th>
                    <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">记录电压</th>
                    <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">典型用途</th>
                  </tr>
                </thead>
                <tbody>
                  {electrodeRef.map((r, i) => (
                    <tr key={i} className="border-b border-[#E8ECF0] dark:border-slate-700">
                      <td className="py-2 text-[#3D5166] dark:text-slate-300 font-mono">{r.spacing}</td>
                      <td className="py-2 text-[#3D5166] dark:text-slate-300 font-mono">{r.voltage}</td>
                      <td className="py-2 text-[#6B7F96] dark:text-slate-400">{r.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Drug Reference */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">💊 常用药物剂量速查</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#E8ECF0] dark:border-slate-700">
                  <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">药物</th>
                  <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">常用剂量</th>
                  <th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">注意事项</th>
                </tr>
              </thead>
              <tbody>
                {drugRef.map((d, i) => (
                  <tr key={i} className="border-b border-[#E8ECF0] dark:border-slate-700">
                    <td className="py-2 text-[#3D5166] dark:text-slate-300 font-medium">{d.drug}</td>
                    <td className="py-2 text-[#3D5166] dark:text-slate-300 font-mono">{d.dose}</td>
                    <td className="py-2 text-[#6B7F96] dark:text-slate-400 text-xs">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-4">⚠️ 本表仅供快速参考，临床决策请以最新指南和药品说明书为准。</p>
        </div>
      </div>
    </AppLayout>
  );
}
