import Link from "next/link";
import AppLayout from "@/components/AppLayout";

const features = [
  {
    icon: "📚",
    title: "病例库",
    desc: "分类浏览 SVT、VT、AF、心房扑动等经典电生理案例",
    href: "/cases",
  },
  {
    icon: "🤖",
    title: "AI 导师",
    desc: "苏格拉底式教学，引导你独立思考而非直接给答案",
    href: "/cases",
  },
  {
    icon: "📝",
    title: "知识测验",
    desc: "选择题形式巩固知识点，检验学习成果",
    href: "/quiz",
  },
  {
    icon: "📤",
    title: "病例投稿",
    desc: "提交你的真实脱敏病例，与同行分享临床经验",
    href: "/submit",
  },
];

const categories = [
  { name: "SVT", color: "bg-svt/20 text-svt border-svt/30", desc: "室上性心动过速" },
  { name: "VT", color: "bg-vt/20 text-vt border-vt/30", desc: "室性心动过速" },
  { name: "AF", color: "bg-af/20 text-af border-af/30", desc: "心房颤动" },
  { name: "AFL", color: "bg-afl/20 text-afl border-afl/30", desc: "心房扑动" },
];

export default function Home() {
  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ep-primary/10 via-transparent to-ep-secondary/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              <span className="text-ep-primary">EP</span> Mentor
            </h1>
            <p className="text-xl text-ep-muted mb-4">
              心脏电生理 AI 导师
            </p>
            <p className="text-lg text-ep-muted mb-10 leading-relaxed">
              专为心脏电生理医生打造的 AI 教学平台。
              <br />
              通过苏格拉底式对话教学，引导你深入理解每一份心电图的背后逻辑。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cases" className="btn-primary text-lg py-3 px-8">
                开始学习
              </Link>
              <Link
                href="/auth"
                className="border border-slate-600 text-white hover:bg-slate-800 font-medium py-3 px-8 rounded-lg transition-colors text-lg"
              >
                注册 / 登录
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          核心功能
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Link key={f.title} href={f.href} className="card group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-ep-primary transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-ep-muted leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          病例分类
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/cases?category=${cat.name}`}
              className={`border rounded-xl p-6 text-center transition-all hover:scale-105 ${cat.color}`}
            >
              <div className="text-2xl font-bold mb-1">{cat.name}</div>
              <div className="text-xs opacity-80">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
