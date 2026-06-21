import Link from "next/link";
import { ROUTES } from "@/lib/routes";

const links = [
  { href: ROUTES.ADMIN, label: "📊 数据统计" },
  { href: ROUTES.ADMIN_CASES, label: "📋 病例管理" },
  { href: ROUTES.ADMIN_GENERATE, label: "🤖 AI 生成" },
  { href: ROUTES.ADMIN_CREATE_CASE, label: "➕ 创建病例" },
  { href: ROUTES.ADMIN_QUIZ, label: "❓ 测验题库" },
  { href: ROUTES.ADMIN_RESOURCES, label: "📚 资料库" },
  { href: ROUTES.ADMIN_SUBMISSIONS, label: "📥 投稿审核" },
  { href: ROUTES.ADMIN_MEMBERSHIP, label: "💎 会员开通" },
];

export default function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#E8ECF0] dark:border-slate-700">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-[#F5F8FC] dark:bg-slate-800 text-[#4B6080] dark:text-slate-300 hover:bg-[#EBF2FA] dark:hover:bg-slate-700 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
