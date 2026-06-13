"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { HomeIcon, CasesIcon, QuizIcon, ProfileIcon } from "@/components/NavIcons";

const tabs = [
  { href: ROUTES.HOME, label: "首页", Icon: HomeIcon },
  { href: ROUTES.CASES, label: "病例库", Icon: CasesIcon },
  { href: ROUTES.QUIZ, label: "测验", Icon: QuizIcon },
  { href: "/profile", label: "我的", Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on admin and auth pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  return (
    <nav aria-label="底部导航" className="md:hidden bottom-nav flex items-center justify-around px-2">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[48px] transition-colors duration-200 ${
              active ? "text-[#1B4F8A] dark:text-blue-400" : "text-[#8FA0B4] dark:text-slate-500"
            }`}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
