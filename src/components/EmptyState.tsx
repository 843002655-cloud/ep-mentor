import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  icon?: string;
  title: string;
  description?: string;
  /** If provided, renders a Link button */
  actionHref?: string;
  actionLabel?: string;
  /** Or a custom element button */
  actionEl?: ReactNode;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  actionHref,
  actionLabel,
  actionEl,
}: Props) {
  return (
    <div className="card text-center py-12 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[#1A2332] dark:text-slate-100 mb-2 font-serif">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#6B7F96] dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-primary inline-block">
          {actionLabel}
        </Link>
      ) : actionEl ? (
        actionEl
      ) : null}
    </div>
  );
}
