"use client";

import { useState, useRef, useCallback } from "react";

type ViewMode = "normal" | "reentry" | "ablation";

const views: { key: ViewMode; label: string; icon: string }[] = [
  { key: "normal", label: "正常传导", icon: "⚡" },
  { key: "reentry", label: "折返环", icon: "🔄" },
  { key: "ablation", label: "消融线", icon: "🎯" },
];

export default function HeartModel({
  className = "",
}: {
  className?: string;
}) {
  const [mode, setMode] = useState<ViewMode>("normal");
  const [rotation, setRotation] = useState({ x: -15, y: 15 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; rotX: number; rotY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Touch/Pointer handlers for rotation ──────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, rotX: rotation.x, rotY: rotation.y };
    },
    [rotation]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setRotation({ x: dragRef.current.rotX + dy * 0.5, y: dragRef.current.rotY + dx * 0.5 });
    },
    []
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(2, s - e.deltaY * 0.001)));
  }, []);

  return (
    <div className={`bg-[#0a0e1a] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b]">
        <span className="text-sm font-medium text-white font-serif">3D 心脏电传导模型</span>
        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setMode(v.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                mode === v.key
                  ? "bg-[#1B4F8A] text-white"
                  : "text-slate-400 hover:text-white hover:bg-[#1e293b]"
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Heart */}
      <div
        ref={containerRef}
        className="relative aspect-[4/3] overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{ background: "radial-gradient(ellipse at center, #1a2332 0%, #0a0e1a 70%)" }}
      >
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full"
          style={{
            transform: `perspective(600px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${scale})`,
            transition: dragRef.current ? "none" : "transform 0.3s ease",
          }}
        >
          {/* ── LA (Left Atrium) — upper right ─────────────────── */}
          <ellipse cx="230" cy="70" rx="65" ry="45" fill="#1e293b" stroke="#475569" strokeWidth="1.5" opacity="0.9" />
          <text x="230" y="75" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">LA</text>

          {/* ── RA (Right Atrium) — upper left ─────────────────── */}
          <ellipse cx="155" cy="75" rx="60" ry="42" fill="#1e293b" stroke="#475569" strokeWidth="1.5" opacity="0.9" />
          <text x="155" y="80" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">RA</text>

          {/* ── LV (Left Ventricle) — lower right ──────────────── */}
          <ellipse cx="225" cy="195" rx="55" ry="75" fill="#1e293b" stroke="#475569" strokeWidth="1.5" opacity="0.9" />
          <text x="225" y="200" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">LV</text>

          {/* ── RV (Right Ventricle) — lower left ──────────────── */}
          <ellipse cx="155" cy="190" rx="48" ry="70" fill="#1e293b" stroke="#475569" strokeWidth="1.5" opacity="0.9" />
          <text x="155" y="195" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">RV</text>

          {/* ── Tricuspid Annulus (RA-RV border) ───────────────── */}
          <ellipse cx="155" cy="140" rx="42" ry="18" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
          <text x="100" y="142" fill="#60a5fa" fontSize="8" textAnchor="end">三尖瓣环</text>

          {/* ── Mitral Annulus (LA-LV border) ──────────────────── */}
          <ellipse cx="225" cy="135" rx="40" ry="16" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
          <text x="310" y="137" fill="#a78bfa" fontSize="8">二尖瓣环</text>

          {/* ── Pulmonary Veins ────────────────────────────────── */}
          <circle cx="250" cy="40" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          <circle cx="265" cy="35" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          <circle cx="238" cy="33" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          <circle cx="275" cy="45" r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          <text x="325" y="42" fill="#f59e0b" fontSize="8">肺静脉</text>

          {/* ── Coronary Sinus ─────────────────────────────────── */}
          <path d="M180 120 Q190 160 175 190" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />
          <text x="195" y="170" fill="#10b981" fontSize="8">CS</text>

          {/* ── His Bundle ─────────────────────────────────────── */}
          <rect x="190" y="128" width="12" height="6" rx="2" fill="#f43f5e" opacity="0.8" />
          <text x="215" y="134" fill="#f43f5e" fontSize="8">His 束</text>

          {/* ── Normal Conduction Path ─────────────────────────── */}
          {mode === "normal" && (
            <>
              <path
                d="M192 132 L192 160 L200 175 L200 220"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                markerEnd="url(#arrowGreen)"
                opacity="0.8"
              />
              <circle cx="192" cy="132" r="3" fill="#22c55e">
                <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
              </circle>
              <text x="165" y="190" fill="#22c55e" fontSize="8" textAnchor="end">正常传导</text>
              <defs>
                <marker id="arrowGreen" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 Z" fill="#22c55e" />
                </marker>
              </defs>
            </>
          )}

          {/* ── Reentry Circuit ────────────────────────────────── */}
          {mode === "reentry" && (
            <>
              <path
                d="M170 130 Q170 90 200 85 Q240 80 240 125 Q240 160 200 165 Q165 170 165 195 L165 205"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="8 3"
                opacity="0.9"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="0.8s" repeatCount="indefinite" />
              </path>
              <circle cx="170" cy="130" r="4" fill="#f59e0b" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <text x="260" y="105" fill="#f59e0b" fontSize="8">折返环（CTI 依赖）</text>
            </>
          )}

          {/* ── Ablation Lines ─────────────────────────────────── */}
          {mode === "ablation" && (
            <>
              {/* CTI line */}
              <line x1="148" y1="155" x2="148" y2="200" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
              <circle cx="148" cy="155" r="2" fill="#ef4444" />
              <circle cx="148" cy="165" r="2" fill="#ef4444" />
              <circle cx="148" cy="175" r="2" fill="#ef4444" />
              <circle cx="148" cy="185" r="2" fill="#ef4444" />
              <circle cx="148" cy="195" r="2" fill="#ef4444" />
              <text x="110" y="215" fill="#ef4444" fontSize="8" textAnchor="end">CTI 消融线</text>

              {/* PVI circles */}
              <ellipse cx="240" cy="42" rx="22" ry="14" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 2" opacity="0.8" />
              <text x="270" y="60" fill="#ef4444" fontSize="8">PVI</text>
            </>
          )}

          {/* ── Chamber Highlights on mode ─────────────────────── */}
          {mode === "reentry" && (
            <>
              <ellipse cx="155" cy="190" rx="48" ry="70" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.5" />
              <ellipse cx="155" cy="75" rx="60" ry="42" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.5" />
            </>
          )}
          {mode === "ablation" && (
            <ellipse cx="225" cy="195" rx="55" ry="75" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.4" />
          )}
        </svg>

        {/* Controls hint */}
        <div className="absolute bottom-2 right-2 text-xs text-slate-500 bg-[#0a0e1a]/80 px-2 py-1 rounded">
          🖐 拖拽旋转 · 滚轮缩放
        </div>
      </div>
    </div>
  );
}
