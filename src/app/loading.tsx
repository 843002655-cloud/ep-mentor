export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#F5F8FC] dark:bg-slate-900">
      <div className="text-center">
        <div className="inline-flex items-center gap-1 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#1B4F8A] dark:bg-blue-400 animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-[#8FA0B4] dark:text-slate-500 font-mono">加载中...</p>
      </div>
    </div>
  );
}
