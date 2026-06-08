interface Props {
  className?: string;
  size?: number;
}

/** 首页 — 房子 */
export function HomeIcon({ size = 24, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 10.182V22h6v-7h6v7h6V10.182L12 2 3 10.182z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 病例库 — 文档夹 */
export function CasesIcon({ size = 24, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 5.5A1.5 1.5 0 013.5 4h5.672a2 2 0 011.414.586L12 6h8.5A1.5 1.5 0 0122 7.5V19a1.5 1.5 0 01-1.5 1.5h-17A1.5 1.5 0 012 19V5.5z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

/** 测验 — 剪贴板+对勾 */
export function QuizIcon({ size = 24, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 2v3h8V2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 我的 — 人像 */
export function ProfileIcon({ size = 24, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
