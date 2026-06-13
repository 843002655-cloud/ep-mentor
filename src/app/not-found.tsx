import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 font-serif mb-3">
          页面未找到
        </h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-8">
          您访问的页面不存在或已被移动。请检查网址是否正确。
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-[#1B4F8A] dark:bg-blue-600 text-white text-sm font-medium hover:bg-[#154070] dark:hover:bg-blue-500 transition-colors"
          >
            返回首页
          </Link>
          <Link
            href="/cases"
            className="px-5 py-2.5 rounded-lg border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300 text-sm font-medium hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors"
          >
            浏览病例库
          </Link>
        </div>
      </div>
    </div>
  );
}
