"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export function DopaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5 select-none">
      <span className="text-[19px] font-black leading-none tracking-tight text-grad-neon">
        ドパニュース
      </span>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-faint">
          Dopa
        </span>
      )}
    </span>
  );
}

export default function TopBar() {
  const { unreadCount } = useSession();

  return (
    <header className="glass sticky top-0 z-50 border-b border-line pad-safe-top">
      <div className="flex h-[52px] items-center justify-between px-4">
        <Link href="/" aria-label="ドパニュース トップ">
          <DopaLogo />
        </Link>
        <div className="flex items-center gap-0.5">
          <Link
            href="/search"
            aria-label="ニュースを検索"
            className="grid h-10 w-10 place-items-center rounded-full text-fg-muted active:bg-white/10"
          >
            <Search size={19} strokeWidth={2.1} />
          </Link>
          <Link
            href="/notifications"
            aria-label="通知"
            className="relative grid h-10 w-10 place-items-center rounded-full text-fg-muted active:bg-white/10"
          >
            <Bell size={19} strokeWidth={2.1} />
            {unreadCount > 0 && (
              <span className="absolute right-[9px] top-[8px] grid h-[15px] min-w-[15px] place-items-center rounded-full bg-[#ff5c7a] px-1 text-[9px] font-bold text-[#0b0d12]">
                {unreadCount > 99 ? "99" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Simple back-and-title header used by secondary screens. */
export function PageHeader({
  title,
  right,
  backHref,
}: {
  title: string;
  right?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <header className="glass sticky top-0 z-50 border-b border-line pad-safe-top">
      <div className="flex h-[52px] items-center gap-2 px-2">
        {backHref !== undefined && (
          <Link
            href={backHref}
            aria-label="戻る"
            className="grid h-10 w-10 place-items-center rounded-full text-fg-muted active:bg-white/10"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
        <h1 className={`flex-1 text-[16px] font-bold ${backHref === undefined ? "px-2" : ""}`}>
          {title}
        </h1>
        {right}
      </div>
    </header>
  );
}
