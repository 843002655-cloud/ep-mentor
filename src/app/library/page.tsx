"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Resource { id: string; title: string; category: string; source: string; url: string; summary: string; }

const categories = [
  { value: "", label: "全部" }, { value: "指南", label: "📋 临床指南" },
  { value: "文献", label: "📄 学术文献" }, { value: "视频", label: "🎬 教学视频" },
  { value: "工具", label: "🔧 实用工具" }, { value: "其他", label: "📌 其他" },
];

const catColors: Record<string, string> = {
  "指南": "bg-[#EBF2FA] text-[#1B4F8A]", "文献": "bg-[#E8F4F0] text-[#0F6E56]",
  "视频": "bg-[#FDE8E8] text-[#9B2C2C]", "工具": "bg-[#FEF3E2] text-[#854F0B]",
  "其他": "bg-[#F5F8FC] text-[#6B7F96]",
};

export default function LibraryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    import("@/lib/services").then(({ resourceService }) => {
      resourceService.getResources(category || undefined).then((res) => {
        setResources(res || []); setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [category]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#1A2332] mb-2 font-serif">学习资料库</h1>
        <p className="text-[#6B7F96] mb-8">临床指南、学术文献、教学视频等学习资源</p>
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                category === c.value ? "bg-[#1B4F8A] text-white border-[#1B4F8A]" : "bg-white text-[#4B6080] border-[#C5D3E0] hover:border-[#1B4F8A]"
              }`}>{c.label}</button>
          ))}
        </div>
        {loading ? <div className="text-center py-20 text-[#6B7F96]">加载中...</div>
        : resources.length === 0 ? <div className="text-center py-20 text-[#6B7F96]"><p className="text-lg">暂无资料</p></div>
        : <div className="space-y-4">
            {resources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card block hover:border-[#1B4F8A]/30 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catColors[r.category] || catColors["其他"]}`}>{r.category}</span>
                      <span className="text-xs text-[#8FA0B4]">{r.source}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1A2332] mb-2 font-serif group-hover:text-[#1B4F8A] transition-colors">{r.title}</h3>
                    <p className="text-sm text-[#6B7F96] line-clamp-2">{r.summary}</p>
                  </div>
                  <span className="text-[#1B4F8A] text-xl mt-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </a>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}
