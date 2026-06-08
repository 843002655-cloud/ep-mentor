"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const tabs = [
  { href: ROUTES.HOME, label: "首页", icon: "🏠" },
  { href: ROUTES.CASES, label: "病例库", icon: "📋" },
  { href: ROUTES.QUIZ, label: "测验", icon: "📝" },
  { href: "/profile", label: "我的", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on admin and auth pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  return (
    <nav className="md:hidden bottom-nav flex items-center justify-around px-2 ">
      {tabs.map((t) => {
        const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[48px] ${
              active ? "text-[#1B4F8A] dark:text-blue-400" : "text-[#8FA0B4] dark:text-slate-500"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
