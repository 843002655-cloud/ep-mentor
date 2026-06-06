import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <footer className="border-t border-slate-700/50 py-8 text-center text-sm text-ep-muted">
        <div className="max-w-7xl mx-auto px-4">
          <p>EP Mentor — 心脏电生理AI教学平台</p>
          <p className="mt-1">
            仅供医学教育使用，不构成临床决策建议
          </p>
        </div>
      </footer>
    </>
  );
}
