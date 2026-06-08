# Dark Mode Tailwind `dark:` Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all handwritten `.dark` CSS overrides with Tailwind `dark:` variants applied inline in every component JSX.

**Architecture:** Enable Tailwind `darkMode: "class"`, strip manual `.dark` rules from `globals.css`, then walk every `.tsx` file adding `dark:` variants to each hardcoded color using a consistent color mapping. ThemeToggle already adds `dark` class to `<html>` — no JS changes needed.

**Tech Stack:** Next.js 14, Tailwind CSS 3.4, TypeScript, React 18

---

## Color Mapping (use everywhere)

| Light class | Add dark variant |
|---|---|
| `text-[#1A2332]` | `dark:text-slate-100` |
| `text-[#3D5166]` | `dark:text-slate-300` |
| `text-[#6B7F96]` | `dark:text-slate-400` |
| `text-[#8FA0B4]` | `dark:text-slate-500` |
| `bg-white` | `dark:bg-slate-900` |
| `bg-[#F5F8FC]` | `dark:bg-slate-800` |
| `bg-[#EBF2FA]` | `dark:bg-slate-700` |
| `border-[#E8ECF0]` | `dark:border-slate-700` |
| `border-[#DDE5EE]` | `dark:border-slate-700` |
| `border-[#C5D3E0]` | `dark:border-slate-600` |
| `text-[#1B4F8A]` | `dark:text-blue-400` |
| `bg-[#1B4F8A]` | `dark:bg-blue-600` |
| `text-[#4B6080]` | `dark:text-slate-300` |
| `hover:bg-gray-50` | `dark:hover:bg-slate-800` |
| `hover:text-[#1B4F8A]` | `dark:hover:text-blue-400` |

**Category + difficulty badges** — keep their colored bg/text identity, add `dark:` variants:
| Badge | Light | Dark |
|---|---|---|
| SVT | `bg-[#EBF2FA] text-[#1B4F8A]` | `dark:bg-blue-900/30 dark:text-blue-300` |
| VT | `bg-[#FDE8E8] text-[#9B2C2C]` | `dark:bg-red-900/30 dark:text-red-300` |
| AF | `bg-[#FEF3E2] text-[#854F0B]` | `dark:bg-amber-900/30 dark:text-amber-300` |
| AFL | `bg-[#EDE9FB] text-[#4C3D9E]` | `dark:bg-purple-900/30 dark:text-purple-300` |
| 基础 difficulty | `bg-[#E8F4F0] text-[#0F6E56]` | `dark:bg-emerald-900/30 dark:text-emerald-300` |
| 进阶 difficulty | `bg-[#FEF3E2] text-[#854F0B]` | `dark:bg-amber-900/30 dark:text-amber-300` |
| 高级 difficulty | `bg-[#FDE8E8] text-[#9B2C2C]` | `dark:bg-red-900/30 dark:text-red-300` |

---

### Task 1: Config + Global CSS

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Enable `darkMode: "class"` in Tailwind config**

Edit `tailwind.config.ts`, add `darkMode` right after `content`:

```ts
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    // ... rest unchanged
  },
};
```

- [ ] **Step 2: Strip all `.dark` manual overrides from globals.css**

Replace `src/app/globals.css` — remove lines 7-91 (all `.dark` rules), keep the rest.

The new `globals.css` should be:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── 移动端基础适配 ────────────────────────────────────────────── */

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  color: #3D5166;
  background: #F5F8FC;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", sans-serif;
}

/* 安全区域适配（刘海屏 / 底部 Home 条） */
.page-container {
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top);
}

/* ── 触摸交互 ──────────────────────────────────────────────────── */

/* 所有可点击元素最小触摸区域 44x44px */
button, a, .clickable {
  min-height: 44px;
  min-width: 44px;
}

/* 移动端点击高亮去除 */
* {
  -webkit-tap-highlight-color: transparent;
}

/* ── 滚动条 ────────────────────────────────────────────────────── */

/* 桌面端滚动条 */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #F5F8FC; }
::-webkit-scrollbar-thumb { background: #C5D3E0; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #8FA0B4; }

/* ── 筛选器横向滚动 ────────────────────────────────────────────── */

.filter-bar {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 8px;
  padding: 0 4px 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.filter-bar::-webkit-scrollbar {
  display: none;
}
.filter-bar > * {
  flex-shrink: 0;
}

/* ── 底部导航栏 ─────────────────────────────────────────────────── */

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 0.5px solid #E8ECF0;
  z-index: 40;
}

/* ── 组件样式 ──────────────────────────────────────────────────── */

@layer components {
  .btn-primary {
    @apply bg-[#1B4F8A] hover:bg-[#154070] text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200
           dark:bg-blue-600 dark:hover:bg-blue-500;
  }
  .btn-secondary {
    @apply bg-white border border-[#C5D3E0] text-[#4B6080] font-medium py-2.5 px-6 rounded-lg hover:bg-gray-50 transition-colors duration-200
           dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700;
  }
  .card {
    @apply bg-white border border-[#DDE5EE] rounded-xl p-4 sm:p-6 hover:border-[#C5D3E0] transition-colors duration-200 shadow-sm
           dark:bg-slate-900 dark:border-slate-700 dark:hover:border-slate-600;
  }
  .badge-category {
    @apply text-xs font-semibold px-2.5 py-0.5 rounded-full;
  }
  .badge-difficulty {
    @apply text-xs font-semibold px-2.5 py-0.5 rounded-full;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: enable Tailwind darkMode class, strip manual .dark CSS overrides"
```

---

### Task 2: Core Components (Navbar, BottomNav, AppLayout, ThemeToggle)

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Update Navbar.tsx** — add `dark:` variants to nav, links, dropdown

```tsx
export default function Navbar() {
  // ... all hooks unchanged ...

  return (
    <nav className="border-b border-[#E8ECF0] dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-50" style={{ borderBottomWidth: 0.5 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold text-[#1A2332] dark:text-slate-100 font-serif hidden sm:inline">EP <span className="text-[#1B4F8A] dark:text-blue-400">Mentor</span></span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${pathname.startsWith(link.href) ? "bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400" : "text-[#6B7F96] dark:text-slate-400 hover:text-[#3D5166] dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"}`}><span className="hidden sm:inline">{link.label}</span><span className="sm:hidden">{link.short}</span></Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-9 h-9 rounded-full bg-[#1B4F8A] dark:bg-blue-600 flex items-center justify-center text-white text-sm font-bold hover:bg-[#154070] dark:hover:bg-blue-500 transition-all" title={user.email}>{avatarLetter}</button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-white dark:bg-slate-900 border border-[#DDE5EE] dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#E8ECF0] dark:border-slate-700"><p className="text-xs text-[#6B7F96] dark:text-slate-400 truncate">{user.email}</p></div>
                    {dropdownItems.filter((item) => !item.admin || isAdmin).map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#3D5166] dark:text-slate-300 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:bg-[#EBF2FA] dark:hover:bg-slate-700 transition-colors"><span>{item.icon}</span><span>{item.label}</span></Link>
                    ))}
                    <div className="border-t border-[#E8ECF0] dark:border-slate-700 mt-1 pt-1">
                      <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#9B2C2C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"><span>🚪</span><span>退出登录</span></button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={ROUTES.AUTH} className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300 rounded-lg hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors whitespace-nowrap">登录</Link>
                <Link href={ROUTES.AUTH_REGISTER} className="text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 rounded-lg text-white font-medium bg-[#1B4F8A] dark:bg-blue-600 hover:bg-[#154070] dark:hover:bg-blue-500 transition-all whitespace-nowrap">免费注册</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update BottomNav.tsx** — add dark variants

```tsx
return (
  <nav className="md:hidden bottom-nav flex items-center justify-around px-2 dark:bg-slate-900 dark:border-slate-700">
    {tabs.map((t) => {
      const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
      return (
        <Link
          key={t.href}
          href={t.href}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[48px] ${
            active ? "text-[#1B4F8A] dark:text-blue-400" : "text-[#8FA0B4] dark:text-slate-500"
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          <span className="text-xs font-medium">{t.label}</span>
        </Link>
      );
    })}
  </nav>
);
```

Also update `.bottom-nav` CSS in globals.css to include dark variants:
```css
.bottom-nav {
  @apply fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-[#E8ECF0] dark:border-slate-700 z-40;
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 3: Update AppLayout.tsx** — footer dark variants

```tsx
<footer className="border-t border-[#E8ECF0] dark:border-slate-700 bg-white dark:bg-slate-900">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
      <div className="col-span-2 md:col-span-1">
        <Link href="/" className="flex items-center gap-2 mb-3">
          <span className="text-2xl">⚡</span>
          <span className="text-lg font-bold text-[#1A2332] dark:text-slate-100 font-serif">
            EP <span className="text-[#1B4F8A] dark:text-blue-400">Mentor</span>
          </span>
        </Link>
        <p className="text-sm text-[#8FA0B4] dark:text-slate-500 leading-relaxed">
          心脏电生理 AI 教学平台<br />用苏格拉底的方式，推演心律失常背后的电生理逻辑。
        </p>
      </div>
      {Object.entries(footerLinks).map(([title, links]) => (
        <div key={title}>
          <h4 className="text-sm font-semibold text-[#1A2332] dark:text-slate-100 mb-3">{title}</h4>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-[#E8ECF0] dark:border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8FA0B4] dark:text-slate-500">
      <p>© {new Date().getFullYear()} EP Mentor. 仅供医学教育使用，不构成临床决策建议。</p>
      <div className="flex items-center gap-4">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">粤ICP备XXXXXXXX号</a>
        <Link href="/terms" className="hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">使用条款</Link>
        <span className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-full px-3 py-0.5 text-[#1B4F8A] dark:text-blue-400">微信小程序即将上线</span>
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Update ThemeToggle.tsx** — already functional, minor visual tweak

The toggle button already works. Just ensure it looks good in both modes:

```tsx
<button
  onClick={toggle}
  className="w-9 h-9 rounded-lg border border-[#C5D3E0] dark:border-slate-600 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
  title={dark ? "切换亮色模式" : "切换暗黑模式"}
>
  {dark ? "☀️" : "🌙"}
</button>
```

(line 26: `dark:border-slate-600` already there in current code — verify it looks like above, add `dark:hover:bg-slate-700`)

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/components/BottomNav.tsx src/components/AppLayout.tsx src/components/ThemeToggle.tsx
git commit -m "feat: add dark mode variants to Navbar, BottomNav, AppLayout, ThemeToggle"
```

---

### Task 3: Homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add dark variants to all colors in Homepage**

Key changes — add `dark:` to every color class. The file is ~275 lines. Here are the crucial sections:

**Hero section:**
```tsx
<section className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-[#E8ECF0] dark:border-slate-700">
  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A2332] dark:text-slate-100 mb-4 leading-tight font-serif">
    <span className="text-[#1B4F8A] dark:text-blue-400">EP</span> Mentor
  </h1>
  <p className="text-xl sm:text-2xl text-[#6B7F96] dark:text-slate-400 mb-3 font-serif">心脏电生理 AI 导师</p>
  <p className="text-lg text-[#6B7F96] dark:text-slate-400 mb-8 leading-relaxed">通过苏格拉底式对话，像资深术者一样思考每一份 EGM</p>
  <Link href={ROUTES.AUTH_REGISTER} className="bg-[#1B4F8A] dark:bg-blue-600 hover:bg-[#154070] dark:hover:bg-blue-500 ...">免费体验 AI 导师</Link>
  <Link href={ROUTES.CASES} className="border border-[#C5D3E0] dark:border-slate-600 text-[#4B6080] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 ...">浏览病例库</Link>
  <p className="text-sm text-[#8FA0B4] dark:text-slate-500">...</p>
</section>
```

**AI Demo card:**
```tsx
<div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-2xl p-5 shadow-sm">
  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8ECF0] dark:border-slate-700">
    ...
    <span className="text-xs text-[#8FA0B4] dark:text-slate-500 ml-3">EP Mentor AI · 导管室模式</span>
  </div>
  <Typewriter texts={aiDemoLines} speed={35} pause={1800} className="text-sm leading-relaxed text-[#3D5166] dark:text-slate-300 font-mono min-h-[180px]" />
</div>
```

**Features section:**
```tsx
<h2 className="text-3xl font-bold text-center text-[#1A2332] dark:text-slate-100 mb-4 font-serif">为什么选择 EP Mentor</h2>
<p className="text-center text-[#6B7F96] dark:text-slate-400 mb-12">...</p>
<h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors font-serif">{f.title}</h3>
<p className="text-sm text-[#6B7F96] dark:text-slate-400 leading-relaxed">{f.desc}</p>
```

**Featured Cases section:**
```tsx
<section className="bg-white dark:bg-slate-900 border-y border-[#E8ECF0] dark:border-slate-700 py-20">
  <h2 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">精选病例预览</h2>
  <p className="text-[#6B7F96] dark:text-slate-400">AI 导师带你逐帧解析经典电生理案例</p>
  ...
  <h3 className="font-semibold text-[#1A2332] dark:text-slate-100 mb-2 group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors font-serif line-clamp-1">{c.title}</h3>
  <p className="text-sm text-[#6B7F96] dark:text-slate-400 line-clamp-2 mb-4 flex-1">{c.description}</p>
  <span className="text-sm text-[#1B4F8A] dark:text-blue-400 font-medium group-hover:underline">AI 导师带你分析 →</span>
</section>
```

**Learning Path section:**
```tsx
<h2 className="text-3xl font-bold text-center text-[#1A2332] dark:text-slate-100 mb-4 font-serif">学习路径</h2>
<p className="text-center text-[#6B7F96] dark:text-slate-400 mb-12">...</p>
<div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-[#E8ECF0] dark:bg-slate-700 -translate-x-1/2" />
// Timeline dot:
<div className="hidden lg:block absolute left-1/2 top-6 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-[#1B4F8A] dark:border-blue-400 -translate-x-1/2 z-10" />
// Card inside:
<h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 font-serif">{step.role}</h3>
<p className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">{step.desc}</p>
<p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-2">{step.cases} 个病例</p>
```

**Bottom CTA section:**
```tsx
<section className="bg-[#1B4F8A] dark:bg-blue-600 py-16">
  <h2 className="text-3xl font-bold text-white mb-4 font-serif">准备好提升你的电生理思维了吗？</h2>
  <p className="text-white/80 mb-8 text-lg">加入 200+ 位同行，用苏格拉底的方式重新学习电生理</p>
  <Link href={ROUTES.AUTH_REGISTER} className="inline-block bg-white dark:bg-slate-100 text-[#1B4F8A] dark:text-blue-700 hover:bg-gray-100 dark:hover:bg-slate-200 font-bold py-3 px-10 rounded-lg transition-colors text-lg">免费开始 →</Link>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add dark mode variants to homepage"
```

---

### Task 4: Cases List Page

**Files:**
- Modify: `src/app/cases/page.tsx`

- [ ] **Step 1: Add dark variants to cases list page**

Key sections to update:

**Page header:**
```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">病例库</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-3">从 SVT 鉴别到室速标测...</p>
<p className="text-xs text-[#8FA0B4] dark:text-slate-500 mb-4">...</p>
```

**Login banner:**
```tsx
<div className="mb-6 ... px-4 py-3 rounded-xl border border-[#1B4F8A]/20 dark:border-blue-400/20 flex ..." style={{ background: "#EBF2FA" }}>
// Replace inline style with Tailwind:
<div className="mb-6 ... px-4 py-3 rounded-xl border border-[#1B4F8A]/20 dark:border-blue-400/20 flex ... bg-[#EBF2FA] dark:bg-slate-700">
  <span className="text-sm text-[#1A2332] dark:text-slate-100">...</span>
  <a ... className="text-sm font-medium text-[#1B4F8A] dark:text-blue-400 hover:text-[#154070] dark:hover:text-blue-300 ...">立即注册 →</a>
</div>
```

**Search input:**
```tsx
<input
  ...
  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 transition-colors"
/>
```

**Filter buttons (FilterBtn):**
```tsx
<button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${active ? "bg-[#1B4F8A] dark:bg-blue-600 text-white border-[#1B4F8A] dark:border-blue-600" : "bg-white dark:bg-slate-800 text-[#4B6080] dark:text-slate-300 border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400 hover:text-[#1B4F8A] dark:hover:text-blue-400"}`}>{active && "✓ "}{children}</button>
```

**Card placeholders:**
```tsx
<div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-4 h-28 flex items-center justify-center text-3xl select-none shrink-0">⚡</div>
```

**Card content:**
```tsx
<h3 className="text-base sm:text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors line-clamp-2">{c.title}</h3>
<p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-3 ...">{c.description}</p>
<span className="text-xs px-2 py-0.5 rounded bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{kp}</span>
<span className="text-[#8FA0B4] dark:text-slate-500">...</span>
```

**Button at card bottom:**
```tsx
<span className="block w-full text-center py-2.5 rounded-[10px] text-white text-sm font-medium bg-[#1B4F8A] dark:bg-blue-600 group-hover:bg-[#154070] dark:group-hover:bg-blue-500 transition-all duration-200">AI 导师带你分析 →</span>
```

**Loading/empty states:**
```tsx
<div className="text-center py-20 text-[#6B7F96] dark:text-slate-400">标测信号中...</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/cases/page.tsx
git commit -m "feat: add dark mode variants to cases list page"
```

---

### Task 5: Case Detail Page (AI Chat)

**Files:**
- Modify: `src/app/cases/[id]/page.tsx`

- [ ] **Step 1: Add dark variants to case detail page**

**Header card:**
```tsx
<div className="card mb-4">  // card class already has dark: variants
  ...
  <h1 className="text-xl sm:text-2xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">{caseData.title}</h1>
  {patient.age != null ? <div className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">...</div> : null}
</div>
```

**All-done panel:**
```tsx
<h2 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">学习完成！</h2>
<p className="text-sm text-[#6B7F96] dark:text-slate-400">...</p>
<h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">📚 关键知识点总结</h3>
<span className="text-[#3D5166] dark:text-slate-300">{kp}</span>
```

**Figure navigator:**
```tsx
<button ... className={`shrink-0 px-2.5 py-1 rounded text-xs font-medium ${
  i < figIdx ? "bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300"
  : i === figIdx ? "bg-[#1B4F8A] dark:bg-blue-600 text-white"
  : "bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400"}`}>
  {i < figIdx ? "✅" : ""} {f.figure_number}
</button>
```

**Figure card:**
```tsx
<div className="card p-3 sticky top-20">  // card already dark
  <div className="text-xs font-medium text-[#1A2332] dark:text-slate-100 mb-2">{figures[figIdx].figure_number}: {figures[figIdx].title}</div>
  <img ... className="w-full rounded-lg mb-3 border border-[#E8ECF0] dark:border-slate-700" />
  <div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg mb-3 h-40 flex items-center justify-center text-3xl">📊</div>
  <button ... className="text-[#1B4F8A] dark:text-blue-400 disabled:opacity-30 hover:underline">← 上一张</button>
  <span className="text-[#8FA0B4] dark:text-slate-500">{figIdx+1}/{figures.length}</span>
  <button ... className="text-[#1B4F8A] dark:text-blue-400 hover:underline">下一张 →</button>
</div>
```

**Chat messages:**
```tsx
// User bubble (blue bg — keep blue, just adjust shade):
<div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${msg.role==="user" ? "bg-[#1B4F8A] dark:bg-blue-600 text-white" : "bg-[#F5F8FC] dark:bg-slate-800 text-[#3D5166] dark:text-slate-300"}`}>
```

**Chat input:**
```tsx
<textarea ... className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 resize-none" />
```

**Action buttons:**
```tsx
<span className="text-xs text-[#8FA0B4] dark:text-slate-500">分析完当前步骤后：</span>
<button ... className="text-xs px-3 py-1 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400 rounded-lg hover:bg-[#1B4F8A] dark:hover:bg-blue-600 hover:text-white transition-colors">下一步 →</button>
<button ... className="text-xs px-3 py-1 bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300 rounded-lg hover:bg-[#0F6E56] dark:hover:bg-emerald-700 hover:text-white transition-colors">🎉 查看总结 →</button>
```

**Loading state:**
```tsx
<div className="flex justify-start"><div className="bg-[#F5F8FC] dark:bg-slate-800 text-[#8FA0B4] dark:text-slate-500 rounded-xl px-4 py-3 text-sm">AI 导师思考中...</div></div>
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/cases/[id]/page.tsx"
git commit -m "feat: add dark mode variants to case detail / AI chat page"
```

---

### Task 6: Quiz Page

**Files:**
- Modify: `src/app/quiz/page.tsx`

- [ ] **Step 1: Add dark variants to quiz page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">知识测验</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8">巩固你的电生理知识（共 {questions.length} 题）</p>

// Finished screen:
<h2 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">测验完成！</h2>
<p className="text-lg text-[#6B7F96] dark:text-slate-400 mb-6">得分：...</p>

// Progress bar:
<span className="text-sm text-[#8FA0B4] dark:text-slate-500">第 {currentQ + 1} / {questions.length} 题</span>
<div className="flex-1 h-2 bg-[#E8ECF0] dark:bg-slate-700 rounded-full overflow-hidden">
  <div className="h-full bg-[#1B4F8A] dark:bg-blue-600 rounded-full transition-all" style={{...}} />
</div>

// Question:
<h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-6 font-serif">{q.question}</h2>

// Options:
<button ... className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
  submitted && i === q.correct ? "border-[#0F6E56] dark:border-emerald-400 bg-[#E8F4F0] dark:bg-emerald-900/30 text-[#0F6E56] dark:text-emerald-300"
  : submitted && i === selected && i !== q.correct ? "border-[#9B2C2C] dark:border-red-400 bg-[#FDE8E8] dark:bg-red-900/30 text-[#9B2C2C] dark:text-red-300"
  : selected === i ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400"
  : "border-[#C5D3E0] dark:border-slate-600 text-[#3D5166] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400"
}`}>...</button>

// Explanation:
{submitted && <div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-lg p-4 mb-6"><p className="text-sm text-[#3D5166] dark:text-slate-300">{q.explanation}</p></div>}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/quiz/page.tsx
git commit -m "feat: add dark mode variants to quiz page"
```

---

### Task 7: Library + Dashboard Pages

**Files:**
- Modify: `src/app/library/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add dark variants to Library page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">学习资料库</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8">临床指南、学术文献、教学视频等学习资源</p>

// Filter buttons:
<button ... className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
  category === c.value ? "bg-[#1B4F8A] dark:bg-blue-600 text-white border-[#1B4F8A] dark:border-blue-600"
  : "bg-white dark:bg-slate-800 text-[#4B6080] dark:text-slate-300 border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400"
}`}>...</button>

// Resource cards — use card class + specific dark:
<a ... className="card block hover:border-[#1B4F8A]/30 dark:hover:border-blue-400/30 transition-colors group">
  <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif group-hover:text-[#1B4F8A] dark:group-hover:text-blue-400 transition-colors">{r.title}</h3>
  <p className="text-sm text-[#6B7F96] dark:text-slate-400 line-clamp-2">{r.summary}</p>
  <span className="text-xs text-[#8FA0B4] dark:text-slate-500">{r.source}</span>
</a>
```

- [ ] **Step 2: Add dark variants to Dashboard page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">学习进度</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8">{userEmail}</p>

// Stat cards — use card class:
<div className="card text-center">  // card already dark
  <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
  <div className="text-sm text-[#6B7F96] dark:text-slate-400 mt-1">{s.l}</div>
</div>

<h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">最近学习</h2>

// List items:
<div className="card flex items-center justify-between py-4">
  <span className="text-[#1A2332] dark:text-slate-100">{p.cases?.title||"未知"}</span>
  <span className="text-sm text-[#8FA0B4] dark:text-slate-500">{new Date(p.completed_at).toLocaleDateString("zh-CN")}</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/library/page.tsx src/app/dashboard/page.tsx
git commit -m "feat: add dark mode variants to library and dashboard pages"
```

---

### Task 8: Auth + Profile Pages

**Files:**
- Modify: `src/app/auth/page.tsx`
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add dark variants to Auth page**

```tsx
// Card already dark via .card class
<h1 className="text-2xl font-bold text-[#1A2332] dark:text-slate-100 text-center mb-2 font-serif">{isRegister ? "注册" : "登录"}</h1>
<p className="text-sm text-[#6B7F96] dark:text-slate-400 text-center mb-6">...</p>

// Labels:
<label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">邮箱</label>
<label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-2">身份</label>

// Input — update inputClass:
const inputClass = "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 transition-colors";

// Radio buttons:
<label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${role === r.value ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400" : "border-[#C5D3E0] dark:border-slate-600 text-[#3D5166] dark:text-slate-300 hover:border-[#1B4F8A] dark:hover:border-blue-400"}`}>

// Interest tags:
<button ... className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${interests.includes(s.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400" : "border-[#C5D3E0] dark:border-slate-600 text-[#6B7F96] dark:text-slate-400 hover:border-[#1B4F8A] dark:hover:border-blue-400"}`}>

// Toggle login/register:
<button onClick={...} className="text-sm text-[#1B4F8A] dark:text-blue-400 hover:text-[#154070] dark:hover:text-blue-300 hover:underline transition-colors">
```

- [ ] **Step 2: Add dark variants to Profile page**

```tsx
<h1 className="text-xl font-bold text-[#1A2332] dark:text-slate-100 font-serif">{user?.email || "用户"}</h1>

// Tags:
<span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF2FA] dark:bg-slate-700 text-[#1B4F8A] dark:text-blue-400">{roleLabels[role] || role}</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F8FC] dark:bg-slate-800 text-[#6B7F96] dark:text-slate-400">{subspecialtyLabels[k] || k}</span>

// Link:
<Link href={ROUTES.AUTH} className="text-sm text-[#6B7F96] dark:text-slate-400 hover:text-[#1B4F8A] dark:hover:text-blue-400 transition-colors">编辑资料</Link>

// Stat cards — use card class:
<div className="card text-center">
  <div className={`text-2xl font-bold mt-1 ${s.c}`}>{s.v}</div>
  <div className="text-xs text-[#6B7F96] dark:text-slate-400 mt-1">{s.l}</div>
</div>

// Section headers:
<h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">🏅 学习徽章</h2>
<h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📖 最近学习</h2>

// Badges:
<div className="text-xs font-medium text-[#1A2332] dark:text-slate-100">{b.name}</div>
<div className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-0.5">{b.unlocked ? "已解锁" : "未解锁"}</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/page.tsx src/app/profile/page.tsx
git commit -m "feat: add dark mode variants to auth and profile pages"
```

---

### Task 9: Remaining Public Pages (Tools, Submit, Upgrade, About, Terms)

**Files:**
- Modify: `src/app/tools/page.tsx`
- Modify: `src/app/submit/page.tsx`
- Modify: `src/app/upgrade/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/terms/page.tsx`

- [ ] **Step 1: Add dark variants to Tools page**

Key changes — apply the standard mapping to all hardcoded colors. Update card headers:
```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">EP 工具库</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8">...</p>
<h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">📐 QTc 计算器</h2>
```

Input styling:
```tsx
<input ... className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-sm text-[#1A2332] dark:text-slate-100 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400" />
```

Result panel:
```tsx
<div className="bg-[#F5F8FC] dark:bg-slate-800 rounded-lg p-4 text-center">
  <p className="text-xs text-[#6B7F96] dark:text-slate-400">校正 QTc (Bazett)</p>
  <p className="text-3xl font-bold text-[#1B4F8A] dark:text-blue-400 font-mono">{qtc} ms</p>
```

Checkbox items:
```tsx
<label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${selected.has(f.key) ? "border-[#1B4F8A] dark:border-blue-400 bg-[#EBF2FA] dark:bg-slate-700" : "border-[#C5D3E0] dark:border-slate-600 hover:border-[#1B4F8A] dark:hover:border-blue-400"}`}>
  <span className="text-sm text-[#3D5166] dark:text-slate-300 flex-1">{f.label}</span>
  <span className="text-xs font-bold text-[#1B4F8A] dark:text-blue-400">+{f.points}</span>
</label>
```

Table cells:
```tsx
<th className="py-2 text-[#6B7F96] dark:text-slate-400 font-medium">电极间距</th>
<td className="py-2 text-[#3D5166] dark:text-slate-300 font-mono">{r.spacing}</td>
<td className="py-2 text-[#6B7F96] dark:text-slate-400">{r.usage}</td>
```

Disclaimer:
```tsx
<p className="text-xs text-[#8FA0B4] dark:text-slate-500 mt-4">⚠️ 本表仅供快速参考...</p>
```

- [ ] **Step 2: Add dark variants to Submit page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">病例投稿</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8">提交你的真实脱敏病例</p>

// Warning box:
<div className="bg-[#FEF3E2] dark:bg-amber-900/20 border border-[#854F0B]/20 dark:border-amber-500/20 rounded-lg p-4 mb-6">
  <p className="text-sm text-[#854F0B] dark:text-amber-300">...</p>
</div>

// Labels:
<label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">{f.label}</label>

// Input class — update:
const inputClass = "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded-lg text-[#1A2332] dark:text-slate-100 placeholder-[#8FA0B4] dark:placeholder-slate-500 focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400 transition-colors";
```

- [ ] **Step 3: Add dark variants to Upgrade page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-4 font-serif">升级会员</h1>
<p className="text-[#6B7F96] dark:text-slate-400 mb-8 leading-relaxed">...</p>
<div className="text-2xl font-bold text-[#1B4F8A] dark:text-blue-400 mb-2">¥19.9 / 月</div>
<ul className="text-sm text-[#3D5166] dark:text-slate-300 space-y-2 text-left mb-6">
<p className="text-xs text-[#8FA0B4] dark:text-slate-500">支付功能开发中...</p>
```

- [ ] **Step 4: Add dark variants to About + Terms pages**

About:
```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-6 font-serif">关于 EP Mentor</h1>
<div className="prose text-[#3D5166] dark:text-slate-300 leading-relaxed space-y-4">
<div className="bg-[#F5F8FC] dark:bg-slate-800 border border-[#DDE5EE] dark:border-slate-700 rounded-xl p-6 mt-8">
  <h2 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">联系我们</h2>
```

Terms — similar pattern, section headers + body text:
```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-8 font-serif">使用条款与版权声明</h1>
<div className="prose text-[#3D5166] dark:text-slate-300 leading-relaxed space-y-6">
  <h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-3 font-serif">知识产权</h2>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/tools/page.tsx src/app/submit/page.tsx src/app/upgrade/page.tsx src/app/about/page.tsx src/app/terms/page.tsx
git commit -m "feat: add dark mode variants to tools, submit, upgrade, about, terms pages"
```

---

### Task 10: Admin Pages

**Files:**
- Modify: `src/app/admin/cases/page.tsx`
- Modify: `src/app/admin/generate/page.tsx`
- Modify: `src/app/admin/quiz/page.tsx`
- Modify: `src/app/admin/resources/page.tsx`
- Modify: `src/app/admin/submissions/page.tsx`
- Modify: `src/app/admin/create-case/page.tsx`

- [ ] **Step 1: Add dark variants to Admin Cases page**

```tsx
<h1 className="text-3xl font-bold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">病例管理</h1>
<p className="text-[#6B7F96] dark:text-slate-400">增删改查病例</p>

// Edit form:
<h2 className="text-xl font-semibold text-[#1A2332] dark:text-slate-100 mb-4">{isNew ? "新建病例" : "编辑病例"}</h2>
<label className="block text-sm font-medium text-[#3D5166] dark:text-slate-300 mb-1">标题</label>

// Update inputClass:
const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#C5D3E0] dark:border-slate-600 rounded text-[#1A2332] dark:text-slate-100 text-sm focus:outline-none focus:border-[#1B4F8A] dark:focus:border-blue-400";

// Case list items:
<div className="text-[#1A2332] dark:text-slate-100 font-medium">{c.title}</div>
<div className="text-xs text-[#8FA0B4] dark:text-slate-500">{c.difficulty} | {c.is_published ? "🟢 已发布" : "⚪ 未发布"}</div>

// Action buttons:
<button ... className="text-xs px-3 py-1 border border-[#C5D3E0] dark:border-slate-600 rounded text-[#4B6080] dark:text-slate-300 hover:text-[#1B4F8A] dark:hover:text-blue-400 hover:border-[#1B4F8A] dark:hover:border-blue-400">...</button>
<button ... className="text-xs px-3 py-1 border border-[#1B4F8A]/50 dark:border-blue-400/50 rounded text-[#1B4F8A] dark:text-blue-400 hover:bg-[#EBF2FA] dark:hover:bg-slate-700">编辑</button>
<button ... className="text-xs px-3 py-1 border border-[#9B2C2C]/50 dark:border-red-400/50 rounded text-[#9B2C2C] dark:text-red-400 hover:bg-[#FDE8E8] dark:hover:bg-red-900/30">删除</button>
```

- [ ] **Step 2: Quick-scan and fix remaining admin pages**

The other admin pages (`generate`, `quiz`, `resources`, `submissions`, `create-case`) use the same color patterns. Apply the standard mapping:

For each file, find-replace approach:
- `text-[#1A2332]` → `text-[#1A2332] dark:text-slate-100`
- `text-[#3D5166]` → `text-[#3D5166] dark:text-slate-300`
- `text-[#6B7F96]` → `text-[#6B7F96] dark:text-slate-400`
- `text-[#8FA0B4]` → `text-[#8FA0B4] dark:text-slate-500`
- `bg-white` → `bg-white dark:bg-slate-900` (when not in a .card)
- `bg-[#F5F8FC]` → `bg-[#F5F8FC] dark:bg-slate-800`
- `bg-[#EBF2FA]` → `bg-[#EBF2FA] dark:bg-slate-700`
- `border-[#E8ECF0]` → `border-[#E8ECF0] dark:border-slate-700`
- `border-[#DDE5EE]` → `border-[#DDE5EE] dark:border-slate-700`
- `border-[#C5D3E0]` → `border-[#C5D3E0] dark:border-slate-600`

Since the `.card`, `.btn-primary`, `.btn-secondary` classes already have dark variants from globals.css, skip those — they're automatically covered.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/
git commit -m "feat: add dark mode variants to all admin pages"
```

---

### Task 11: Typewriter Component + Final Pass

**Files:**
- Modify: `src/components/Typewriter.tsx`
- Verify: all other component files

- [ ] **Step 1: Check Typewriter component**

Read the Typewriter component and add `dark:` variant to any hardcoded colors. Since it accepts a `className` prop and the text color is usually passed in, it may not need changes. Verify.

- [ ] **Step 2: Full grep for missed hardcoded colors**

Run:
```bash
grep -rn "text-\[#\|bg-\[#\|border-\[#" src/ --include="*.tsx" | grep -v "dark:" | grep -v node_modules
```

For any remaining matches that are color classes (not layout/styling), add `dark:` variants.

- [ ] **Step 3: Commit**

```bash
git add src/components/Typewriter.tsx
git commit -m "feat: final dark mode pass — Typewriter + missed colors"
```

---

### Task 12: Build & Verify

- [ ] **Step 1: Install dependencies (if needed) and lint**

```bash
cd "E:\fk claude\ep-mentor" && npm run lint
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds with no Tailwind/dark-related errors.

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Open in browser, click the 🌙/☀️ toggle button. Verify:
- [ ] Background switches between light/dark
- [ ] All text readable with good contrast
- [ ] Cards show correct dark background
- [ ] Inputs, borders, badges all switch
- [ ] No visual regressions in light mode

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification after dark mode refactor"
```
