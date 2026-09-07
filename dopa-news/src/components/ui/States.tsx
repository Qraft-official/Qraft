"use client";

import type { ReactNode } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function NewsCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-[168px] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex gap-3 p-3">
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-fg-faint">{icon}</div>}
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-[260px] text-[12.5px] leading-relaxed text-fg-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "データを読み込めませんでした",
  detail,
  onRetry,
}: {
  message?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#ff5c7a]/25 bg-[#ff5c7a]/[0.06] px-6 py-10 text-center">
      <WifiOff size={22} className="mb-3 text-[#ff5c7a]" />
      <p className="text-[14.5px] font-semibold text-fg">{message}</p>
      {detail && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-[13px] font-semibold text-fg transition-colors active:bg-white/10"
        >
          <RefreshCw size={14} />
          再試行
        </button>
      )}
    </div>
  );
}
