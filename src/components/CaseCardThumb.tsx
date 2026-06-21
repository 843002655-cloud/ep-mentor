interface Props {
  category: string;
}

const ECG_POINTS =
  "0,40 20,40 30,40 35,8 40,40 45,40 55,40 65,40 70,32 75,40 80,40 90,40 100,40 105,12 110,40 115,40 125,40 135,40 140,32 145,40 150,40 160,40 170,40 175,8 180,40 185,40 195,40 205,40 210,20 215,40 220,40 230,40 240,40 245,12 250,40 255,40 265,40 275,40 280,32 285,40 300,40";

const catStyles: Record<string, { bg: string; stroke: string; darkBg: string; darkStroke: string }> = {
  SVT: { bg: "#EBF2FA", stroke: "#1B4F8A", darkBg: "#1e3a5f", darkStroke: "#60a5fa" },
  VT:  { bg: "#FDE8E8", stroke: "#9B2C2C", darkBg: "#3b1a1a", darkStroke: "#f87171" },
  AF:  { bg: "#FEF3E2", stroke: "#854F0B", darkBg: "#3b2a15", darkStroke: "#fbbf24" },
};

export default function CaseCardThumb({ category }: Props) {
  const s = catStyles[category] || catStyles.SVT;

  return (
    <div className="relative rounded-lg mb-4 h-28 flex items-center justify-center overflow-hidden select-none shrink-0">
      {/* Light bg */}
      <div className="absolute inset-0 dark:hidden" style={{ background: s.bg }} />
      {/* Dark bg */}
      <div className="absolute inset-0 hidden dark:block" style={{ background: s.darkBg }} />

      {/* ECG waveform — light */}
      <svg viewBox="0 0 300 80" className="absolute inset-0 w-full h-full opacity-40 dark:hidden" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="300" y2="20" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />
        <line x1="0" y1="40" x2="300" y2="40" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />
        <line x1="0" y1="60" x2="300" y2="60" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />
        <polyline fill="none" stroke={s.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={ECG_POINTS} />
      </svg>

      {/* ECG waveform — dark */}
      <svg viewBox="0 0 300 80" className="absolute inset-0 w-full h-full opacity-30 hidden dark:block" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="300" y2="20" stroke={s.darkStroke} strokeWidth="0.3" opacity="0.2" />
        <line x1="0" y1="40" x2="300" y2="40" stroke={s.darkStroke} strokeWidth="0.3" opacity="0.2" />
        <line x1="0" y1="60" x2="300" y2="60" stroke={s.darkStroke} strokeWidth="0.3" opacity="0.2" />
        <polyline fill="none" stroke={s.darkStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={ECG_POINTS} />
      </svg>

      {/* Category label */}
      <span className="relative z-10 text-sm font-bold font-mono tracking-wider opacity-70 dark:opacity-80 dark:hidden" style={{ color: s.stroke }}>
        {category}
      </span>
      <span className="relative z-10 text-sm font-bold font-mono tracking-wider opacity-80 hidden dark:inline" style={{ color: s.darkStroke }}>
        {category}
      </span>
    </div>
  );
}
