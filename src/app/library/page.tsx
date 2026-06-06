"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";

interface Resource {
  id: string;
  title: string;
  category: string;
  source: string;
  url: string;
  summary: string;
  created_at: string;
}

const categories = [
  { value: "", label: "全部" },
  { value: "指南", label: "📋 临床指南" },
  { value: "文献", label: "📄 学术文献" },
  { value: "视频", label: "🎬 教学视频" },
  { value: "工具", label: "🔧 实用工具" },
  { value: "其他", label: "📌 其他" },
];

const catColors: Record<string, string> = {
  "指南": "bg-blue-500/20 text-blue-400", "文献": "bg-green-500/20 text-green-400",
  "视频": "bg-red-500/20 text-red-400", "工具": "bg-yellow-500/20 text-yellow-400",
  "其他": "bg-slate-500/20 text-slate-400",
};

export default function LibraryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = category ? `?category=${category}` : "";
    fetch(`/api/resources${params}`)
      .then((r) => r.json())
      .then((data) => { setResources(data.resources || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">学习资料库</h1>
        <p className="text-ep-muted mb-8">临床指南、学术文献、教学视频等学习资源</p>

        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                category === c.value ? "bg-ep-primary/20 text-ep-primary border-ep-primary/50" : "bg-ep-card text-ep-muted border-slate-700 hover:border-slate-500"
              }`}>{c.label}</button>
          ))}
        </div>

        {loading ? <div className="text-center py-20 text-ep-muted">加载中...</div>
        : resources.length === 0 ? <div className="text-center py-20 text-ep-muted"><p className="text-lg">暂无资料</p><p className="text-sm mt-2">管理员可在后台添加</p></div>
        : <div className="space-y-4">
            {resources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card block hover:border-ep-primary/30 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catColors[r.category] || catColors["其他"]}`}>{r.category}</span>
                      <span className="text-xs text-ep-muted">{r.source}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-ep-primary transition-colors">{r.title}</h3>
                    <p className="text-sm text-ep-muted line-clamp-2">{r.summary}</p>
                  </div>
                  <span className="text-ep-primary text-xl mt-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </a>
            ))}
          </div>
        }
      </div>
    </AppLayout>
  );
}
