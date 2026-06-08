# Dark Mode: Tailwind `dark:` Refactor

## Goal

Replace handwritten `.dark` CSS overrides in `globals.css` with Tailwind's native `dark:` variant, applied directly in each component/page JSX.

## Why

- Current approach: ~100 lines of `.dark .card {}`, `.dark .bg-white {}`, `.dark .text-[#...] {}` in globals.css. Fragile, incomplete, CSS-specificity issues.
- Tailwind `dark:` approach: colors sit right next to the light variant in JSX, no hidden CSS to hunt down, every new piece of UI gets dark support naturally.

## Strategy

**One color mapping, used everywhere:**

| Light | Dark |
|-------|------|
| `#1A2332` / `#3D5166` (text) | `text-slate-100` / `text-slate-300` |
| `#6B7F96` (muted text) | `text-slate-400` |
| `#8FA0B4` (placeholder) | `text-slate-500` |
| `bg-white` | `dark:bg-slate-900` |
| `bg-[#F5F8FC]` (page bg, card alt) | `dark:bg-slate-800` |
| `bg-[#EBF2FA]` (primary light) | `dark:bg-slate-700` |
| `border-[#E8ECF0]` / `border-[#DDE5EE]` | `dark:border-slate-700` |
| `border-[#C5D3E0]` (input border) | `dark:border-slate-600` |
| `#1B4F8A` (primary) | `dark:text-blue-400` (text) / `dark:bg-blue-600` (bg) |

**Files touched:**

1. `tailwind.config.ts` — add `darkMode: "class"`
2. `src/app/globals.css` — delete all `.dark` manual overrides, keep base styles
3. All page/component `.tsx` files — add `dark:` variants to every hardcoded color class

**What does NOT change:**

- ThemeToggle logic (already adds `dark` class to `<html>`)
- Color palette identity (primary blue, category colors, difficulty badges — all remain recognizable)
- Layout, spacing, typography

## Acceptance

- Toggle dark mode on any page: all backgrounds, text, borders, inputs switch cleanly
- No light-colored flash on page navigation
- No regression in light mode appearance
