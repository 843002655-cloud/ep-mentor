import React from "react";

/** Base animated pulse box */
export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#E8ECF0] dark:bg-slate-700 ${className}`}
    />
  );
}

/** Card-shaped skeleton (title + 2 lines of body text) */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card ${className}`}>
      <SkeletonBox className="h-5 w-2/3 mb-3" />
      <SkeletonBox className="h-4 w-full mb-2" />
      <SkeletonBox className="h-4 w-3/4 mb-4" />
      <div className="flex gap-2">
        <SkeletonBox className="h-6 w-14 rounded-full" />
        <SkeletonBox className="h-6 w-10 rounded-full" />
      </div>
    </div>
  );
}

/** Case card skeleton with thumbnail placeholder + text */
export function SkeletonCaseCard() {
  return (
    <div className="card flex flex-col">
      <SkeletonBox className="h-28 w-full mb-4" />
      <div className="flex gap-2 mb-3">
        <SkeletonBox className="h-5 w-12 rounded-full" />
        <SkeletonBox className="h-5 w-10 rounded-full" />
      </div>
      <SkeletonBox className="h-5 w-3/4 mb-2" />
      <SkeletonBox className="h-4 w-full mb-1" />
      <SkeletonBox className="h-4 w-2/3 mb-3" />
      <div className="flex gap-1.5 mb-3">
        <SkeletonBox className="h-5 w-24" />
        <SkeletonBox className="h-5 w-16" />
      </div>
      <div className="flex justify-between mb-4">
        <SkeletonBox className="h-4 w-16" />
        <SkeletonBox className="h-4 w-20" />
      </div>
      <SkeletonBox className="h-10 w-full rounded-[10px]" />
    </div>
  );
}

/** Horizontal list item skeleton */
export function SkeletonListItem({ className = "" }: { className?: string }) {
  return (
    <div className={`card flex items-center justify-between py-4 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        <SkeletonBox className="h-6 w-12 rounded-full shrink-0" />
        <SkeletonBox className="h-5 flex-1 max-w-[200px]" />
      </div>
      <SkeletonBox className="h-4 w-20 shrink-0" />
    </div>
  );
}

/** Stat cards grid (2x2 or 1x4) */
export function SkeletonStatCards({ cols = 4 }: { cols?: number }) {
  const colClass = cols === 4 ? "grid grid-cols-2 md:grid-cols-4 gap-4" : "grid grid-cols-2 gap-4";
  return (
    <div className={colClass}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="card text-center">
          <SkeletonBox className="h-8 w-8 mx-auto mb-2 rounded" />
          <SkeletonBox className="h-7 w-12 mx-auto mb-1" />
          <SkeletonBox className="h-4 w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/** Resource list skeleton */
export function SkeletonResourceItem() {
  return (
    <div className="card flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <SkeletonBox className="h-5 w-12 rounded-full" />
          <SkeletonBox className="h-4 w-16" />
        </div>
        <SkeletonBox className="h-5 w-3/4 mb-2" />
        <SkeletonBox className="h-4 w-full" />
      </div>
      <SkeletonBox className="h-6 w-6 mt-2 shrink-0 rounded" />
    </div>
  );
}

/** Full-page loading: title + subtitle + grid of skeletons */
export function SkeletonPage({
  variant = "card",
  count = 3,
  cols = "md:grid-cols-2 lg:grid-cols-3",
}: {
  variant?: "card" | "case" | "list" | "resource" | "stat";
  count?: number;
  cols?: string;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SkeletonBox className="h-8 w-48 mb-2" />
      <SkeletonBox className="h-5 w-80 mb-8" />
      {variant === "stat" ? (
        <SkeletonStatCards />
      ) : variant === "list" ? (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      ) : variant === "resource" ? (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonResourceItem key={i} />
          ))}
        </div>
      ) : variant === "case" ? (
        <div className={`grid ${cols} gap-6`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCaseCard key={i} />
          ))}
        </div>
      ) : (
        <div className={`grid ${cols} gap-6`}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
