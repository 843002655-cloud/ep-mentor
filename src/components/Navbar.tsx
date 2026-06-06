"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { authService } from "@/lib/services";
import { onDocumentEvent, navigateTo } from "@/lib/browser";
import { ROUTES } from "@/lib/routes";
import ThemeToggle from "@/components/ThemeToggle";

const mainLinks = [
  { href: ROUTES.CASES, label: "病例库", short: "病例" },
  { href: ROUTES.QUIZ, label: "知识测验", short: "测验" },
  { href: "/tools", label: "EP 工具", short: "工具" },
  { href: ROUTES.LIBRARY, label: "资料库", short: "资料" },
];

const dropdownItems = [
  { href: "/profile", label: "个人中心", icon: "👤" },
  { href: ROUTES.DASHBOARD, label: "学习进度", icon: "📊" },
  { href: ROUTES.SUBMIT, label: "投稿案例", icon: "📝" },
  { href: ROUTES.ADMIN, label: "管理后台", icon: "⚙️", admin: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authService.getUser().then((u) => { setUser(u); setIsAdmin(authService.isAdmin()); });
    const sub = authService.onAuthChange((u) => { setUser(u); setIsAdmin(authService.isAdmin()); });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    return onDocumentEvent("mousedown", handler);
  }, []);

  const handleLogout = async () => { await authService.logout(); navigateTo(ROUTES.HOME); };
  const avatarLetter = user?.email?.[0]?.toUpperCase() || "?";

  return (
    <nav className="border-b border-[#E8ECF0] bg-white sticky top-0 z-50" style={{ borderBottomWidth: 0.5 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold text-[#1A2332] font-serif hidden sm:inline">EP <span className="text-[#1B4F8A]">Mentor</span></span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${pathname.startsWith(link.href) ? "bg-[#EBF2FA] text-[#1B4F8A]" : "text-[#6B7F96] hover:text-[#3D5166] hover:bg-gray-50"}`}><span className="hidden sm:inline">{link.label}</span><span className="sm:hidden">{link.short}</span></Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-9 h-9 rounded-full bg-[#1B4F8A] flex items-center justify-center text-white text-sm font-bold hover:bg-[#154070] transition-all" title={user.email}>{avatarLetter}</button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white border border-[#DDE5EE] rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#E8ECF0]"><p className="text-xs text-[#6B7F96] truncate">{user.email}</p></div>
                    {dropdownItems.filter((item) => !item.admin || isAdmin).map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#3D5166] hover:text-[#1B4F8A] hover:bg-[#EBF2FA] transition-colors"><span>{item.icon}</span><span>{item.label}</span></Link>
                    ))}
                    <div className="border-t border-[#E8ECF0] mt-1 pt-1">
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-[#6B7F96] hover:text-[#9B2C2C] hover:bg-red-50 transition-colors w-full text-left"><span>🚪</span><span>退出登录</span></button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={ROUTES.AUTH} className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 border border-[#C5D3E0] text-[#4B6080] rounded-lg hover:border-[#1B4F8A] hover:text-[#1B4F8A] transition-colors whitespace-nowrap">登录</Link>
                <Link href={ROUTES.AUTH_REGISTER} className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 rounded-lg text-white font-medium bg-[#1B4F8A] hover:bg-[#154070] transition-all whitespace-nowrap">免费注册</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
