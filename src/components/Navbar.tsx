"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const mainLinks = [
  { href: "/cases", label: "病例库" },
  { href: "/quiz", label: "知识测验" },
  { href: "/library", label: "资料库" },
];

const dropdownItems = [
  { href: "/dashboard", label: "学习进度", icon: "📊" },
  { href: "/submit", label: "投稿案例", icon: "📝" },
  { href: "/admin/cases", label: "管理后台", icon: "⚙️", admin: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setIsAdmin(user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsAdmin(session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    window.location.href = "/";
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() || "?";

  return (
    <nav className="border-b border-[rgba(99,102,241,0.2)] bg-ep-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold text-white hidden sm:inline">
              EP <span className="text-ep-primary">Mentor</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-ep-primary/20 text-ep-primary"
                    : "text-ep-muted hover:text-white hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-sm font-bold hover:brightness-110 transition-all"
                  title={user.email}
                >
                  {avatarLetter}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-ep-card border border-slate-600/50 rounded-xl shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-700/50">
                      <p className="text-xs text-ep-muted truncate">{user.email}</p>
                    </div>
                    {dropdownItems
                      .filter((item) => !item.admin || isAdmin)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-ep-muted hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    <div className="border-t border-slate-700/50 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-ep-muted hover:text-red-400 hover:bg-slate-800 transition-colors w-full text-left"
                      >
                        <span>🚪</span>
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 border border-white/30 text-white rounded-lg hover:border-white/50 transition-colors whitespace-nowrap"
                >
                  登录
                </Link>
                <Link
                  href="/auth?register=1"
                  className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 rounded-lg text-white font-medium bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:brightness-110 transition-all whitespace-nowrap"
                >
                  免费注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
