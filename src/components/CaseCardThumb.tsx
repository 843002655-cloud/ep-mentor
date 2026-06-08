interface Props {
  category: string;
}

const catStyles: Record<string, { bg: string; stroke: string; fill: string; darkBg: string; darkStroke: string }> = {
  SVT:   { bg: "#EBF2FA", stroke: "#1B4F8A", fill: "#1B4F8A20", darkBg: "#1e3a5f", darkStroke: "#60a5fa" },
  VT:    { bg: "#FDE8E8", stroke: "#9B2C2C", fill: "#9B2C2C20", darkBg: "#3b1a1a", darkStroke: "#f87171" },
  AF:    { bg: "#FEF3E2", stroke: "#854F0B", fill: "#854F0B20", darkBg: "#3b2a15", darkStroke: "#fbbf24" },
  AFL:   { bg: "#EDE9FB", stroke: "#4C3D9E", fill: "#4C3D9E20", darkBg: "#1e1b3b", darkStroke: "#a78bfa" },
};

export default function CaseCardThumb({ category }: Props) {
  const s = catStyles[category] || catStyles.SVT;

  return (
    <div
      className="relative rounded-lg mb-4 h-28 flex items-center justify-center overflow-hidden select-none shrink-0"
      style={{ background: s.bg }}
    >
      {/* Dark mode bg via inline style fallback — Tailwind handles the rest */}

      {/* ECG waveform SVG */}
      <svg
        viewBox="0 0 300 80"
        className="absolute inset-0 w-full h-full opacity-40"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line x1="0" y1="20" x2="300" y2="20" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />
        <line x1="0" y1="40" x2="300" y2="40" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />
        <line x1="0" y1="60" x2="300" y2="60" stroke={s.stroke} strokeWidth="0.3" opacity="0.3" />

        {/* ECG waveform */}
        <polyline
          fill="none"
          stroke={s.stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dark:stroke-inherit"
          points="
            0,40 20,40 30,40 35,8 40,40 45,40
            55,40 65,40 70,32 75,40 80,40
            90,40 100,40 105,12 110,40 115,40
            125,40 135,40 140,32 145,40 150,40
            160,40 170,40 175,8 180,40 185,40
            195,40 205,40 210,20 215,40 220,40
            230,40 240,40 245,12 250,40 255,40
            265,40 275,40 280,32 285,40 300,40
          "
        />
      </svg>

      {/* Category text */}
      <span
        className="relative z-10 text-sm font-bold font-mono tracking-wider opacity-70"
        style={{ color: s.stroke }}
      >
        {category}
      </span>
    </div>
  );
}
