import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import FadeIn from "@/components/FadeIn";
import FooterLinks from "@/components/FooterLinks";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { ROUTES } from "@/lib/routes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      <Navbar />
      <main className="min-h-screen pb-16 md:pb-0">
        <FadeIn>{children}</FadeIn>
      </main>
      <BottomNav />

      <footer className="border-t border-[#E8ECF0] dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href={ROUTES.HOME} className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚡</span>
                <span className="text-lg font-bold text-[#1A2332] dark:text-slate-100 font-serif">
                  EP <span className="text-[#1B4F8A] dark:text-blue-400">Mentor</span>
                </span>
              </Link>
              <p className="text-sm text-[#8FA0B4] dark:text-slate-500 leading-relaxed">
                心脏电生理 AI 教学平台
                <br />
                用苏格拉底的方式，推演心律失常背后的电生理逻辑。
              </p>
            </div>

            {/* Links */}
            <FooterLinks />
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#E8ECF0] dark:border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8FA0B4] dark:text-slate-500">
            <p>
              © {new Date().getFullYear()} EP Mentor. 仅供医学教育使用，不构成临床决策建议。
            </p>
            <div className="flex items-center gap-4">
              <Link href={ROUTES.TERMS} className="hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">
                使用条款
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
