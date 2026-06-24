"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authService } from "@/lib/services";
import { ROUTES } from "@/lib/routes";

const baseLinks = {
  学习: [
    { label: "病例库", href: ROUTES.CASES },
    { label: "知识测验", href: ROUTES.QUIZ },
    { label: "资料库", href: ROUTES.LIBRARY },
    { label: "学习进度", href: ROUTES.DASHBOARD },
  ],
  平台: [
    { label: "关于我们", href: ROUTES.ABOUT },
    { label: "投稿病例", href: ROUTES.SUBMIT },
  ],
  联系: [{ label: "support@yovigo.cn", href: "mailto:support@yovigo.cn" }],
};

export default function FooterLinks() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(authService.isAdmin());
    const sub = authService.onAuthChange(() => setIsAdmin(authService.isAdmin()));
    return () => sub.unsubscribe();
  }, []);

  const platformLinks = [
    ...baseLinks.平台,
    ...(isAdmin ? [{ label: "管理后台", href: ROUTES.ADMIN }] : []),
  ];

  const sections = { ...baseLinks, 平台: platformLinks };

  return (
    <>
      {Object.entries(sections).map(([title, links]) => (
        <div key={title}>
          <h4 className="text-sm font-semibold text-[#1A2332] dark:text-slate-100 mb-3">{title}</h4>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
