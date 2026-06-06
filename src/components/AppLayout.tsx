import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <footer className="border-t border-[#E8ECF0] py-8 text-center text-sm text-[#8FA0B4] bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-[#6B7F96]">EP Mentor — 心脏电生理AI教学平台</p>
          <p className="mt-1">仅供医学教育使用，不构成临床决策建议</p>
        </div>
      </footer>
    </>
  );
}
