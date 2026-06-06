import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { ROUTES } from "@/lib/routes";

const features = [
  { icon: "📚", title: "病例库", desc: "分类浏览 SVT、VT、AF、心房扑动等经典电生理案例", href: ROUTES.CASES },
  { icon: "🤖", title: "AI 导师", desc: "苏格拉底式教学，引导你独立思考而非直接给答案", href: ROUTES.CASES },
  { icon: "📝", title: "知识测验", desc: "选择题形式巩固知识点，检验学习成果", href: ROUTES.QUIZ },
  { icon: "📤", title: "病例投稿", desc: "提交你的真实脱敏病例，与同行分享临床经验", href: ROUTES.SUBMIT },
];

const categories = [
  { name: "SVT", color: "bg-[#EBF2FA] text-[#1B4F8A] border-[#C5D3E0]", desc: "室上性心动过速" },
  { name: "VT", color: "bg-[#FDE8E8] text-[#9B2C2C] border-[#F5C6C6]", desc: "室性心动过速" },
  { name: "AF", color: "bg-[#FEF3E2] text-[#854F0B] border-[#F5D8A8]", desc: "心房颤动" },
  { name: "AFL", color: "bg-[#EDE9FB] text-[#4C3D9E] border-[#C5BEF0]", desc: "心房扑动" },
];

export default function Home() {
  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-[#E8ECF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-[#1A2332] mb-6 font-serif">
              <span className="text-[#1B4F8A]">EP</span> Mentor
            </h1>
            <p className="text-xl text-[#6B7F96] mb-4">每一份心电图，都是一道待解的逻辑题</p>
            <p className="text-lg text-[#6B7F96] mb-10 leading-relaxed">
              不灌输结论，不堆砌幻灯。<br />
              用苏格拉底的方式，推演心律失常背后的电生理逻辑。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={ROUTES.CASES} className="bg-[#1B4F8A] hover:bg-[#154070] text-white font-medium py-3 px-8 rounded-lg transition-colors text-lg">
                进入病例库
              </Link>
              <Link href={ROUTES.AUTH} className="border border-[#C5D3E0] text-[#4B6080] hover:border-[#1B4F8A] hover:text-[#1B4F8A] font-medium py-3 px-8 rounded-lg transition-colors text-lg">
                注册 / 登录
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-[#1A2332] mb-12 font-serif">核心功能</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Link key={f.title} href={f.href} className="card group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-[#1A2332] mb-2 group-hover:text-[#1B4F8A] transition-colors">{f.title}</h3>
              <p className="text-sm text-[#6B7F96] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-center text-[#1A2332] mb-12 font-serif">病例分类</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat.name} href={ROUTES.CASES_CATEGORY(cat.name)} className={`border rounded-xl p-6 text-center transition-all hover:scale-105 ${cat.color}`}>
              <div className="text-2xl font-bold mb-1">{cat.name}</div>
              <div className="text-xs opacity-80">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
