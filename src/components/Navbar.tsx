"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/cases", label: "病例库" },
  { href: "/quiz", label: "知识测验" },
  { href: "/library", label: "资料库" },
  { href: "/submit", label: "投稿" },
  { href: "/dashboard", label: "学习进度" },
];

const adminLink = { href: "/admin/cases", label: "管理后台" };

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setIsAdmin(user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
    });

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(
        session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="border-b border-slate-700/50 bg-ep-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold text-white">
              EP{" "}
              <span className="text-ep-primary">Mentor</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
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

            {isAdmin && (
              <Link
                href={adminLink.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-ep-secondary/20 text-ep-secondary"
                    : "text-ep-muted hover:text-white hover:bg-slate-800"
                }`}
              >
                {adminLink.label}
              </Link>
            )}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-ep-muted hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-ep-muted hover:text-white transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="text-sm py-1.5 px-4 border border-white/30 text-white rounded-lg hover:border-white/50 transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/auth?register=1"
                  className="text-sm py-1.5 px-4 rounded-lg text-white font-medium bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:brightness-110 transition-all"
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
