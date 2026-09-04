"use client";

import Link from "next/link";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-base font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
        >
          {actionLabel}
        </Link>
      )}
      {!actionHref && actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="animate-pulse border-b border-gray-800 px-4 py-4" aria-hidden>
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-white/10" />
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-5/6 rounded bg-white/10" />
          <div className="mt-3 h-28 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-28 bg-white/5" />
      <div className="px-4">
        <div className="-mt-10 h-20 w-20 rounded-full bg-white/10" />
        <div className="mt-3 h-5 w-40 rounded bg-white/10" />
        <div className="mt-2 h-3 w-24 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function DiscoverSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[600px]" aria-busy="true" aria-label="読み込み中">
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="h-11 animate-pulse rounded-full bg-white/10" />
      </div>
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}

export function AppBootSkeleton() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-black" aria-busy="true" aria-label="読み込み中">
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="mx-auto h-5 w-28 animate-pulse rounded bg-white/10" />
      </div>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
