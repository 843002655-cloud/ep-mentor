"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">⚡</div>
        <h1 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif mb-3">
          页面出现异常
        </h1>
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-2">
          {error.message || "发生了意外错误，请稍后重试"}
        </p>
        {error.digest && (
          <p className="text-xs text-[#A0B4C8] dark:text-slate-500 mb-6 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-[#1B4F8A] dark:bg-blue-600 text-white text-sm font-medium hover:bg-[#154070] dark:hover:bg-blue-500 transition-colors"
          >
            重试
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300 text-sm font-medium hover:border-[#1B4F8A] dark:hover:border-blue-400 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
