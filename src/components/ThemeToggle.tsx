"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ep-theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ep-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-lg border border-[#C5D3E0] dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      title={dark ? "切换亮色模式" : "切换暗黑模式"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
