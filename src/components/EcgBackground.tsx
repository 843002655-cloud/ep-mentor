export default function EcgBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Gradient glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#1B4F8A]/5 dark:bg-blue-500/10 blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[#4C3D9E]/5 dark:bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Animated ECG waveform */}
      <svg
        className="absolute bottom-0 left-0 w-full opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        style={{ height: "30%" }}
      >
        <path
          d="M0,60 L100,60 L150,60 L160,15 L170,60 L180,60 L250,60 L300,60 L310,45 L320,60 L330,60 L400,60 L450,60 L460,10 L470,60 L480,60 L550,60 L600,60 L610,40 L620,60 L630,60 L700,60 L750,60 L760,15 L770,60 L780,60 L850,60 L900,60 L910,35 L920,60 L930,60 L1000,60 L1050,60 L1060,12 L1070,60 L1080,60 L1150,60 L1200,60"
          fill="none"
          stroke="#1B4F8A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to="-200 0"
            dur="8s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M200,60 L300,60 L350,60 L360,15 L370,60 L380,60 L450,60 L500,60 L510,45 L520,60 L530,60 L600,60 L650,60 L660,10 L670,60 L680,60 L750,60 L800,60 L810,40 L820,60 L830,60 L900,60 L950,60 L960,15 L970,60 L980,60 L1050,60 L1100,60 L1110,35 L1120,60 L1130,60 L1200,60 L1250,60 L1260,12 L1270,60 L1280,60 L1350,60 L1400,60"
          fill="none"
          stroke="#1B4F8A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            from="100 0"
            to="-100 0"
            dur="12s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}
