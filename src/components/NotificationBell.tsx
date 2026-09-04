"use client";

import { useApp } from "@/lib/store";
import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBell({
  className = "",
  showLabel,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { unreadNotificationCount } = useApp();
  const unread = unreadNotificationCount > 0;

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-11 w-11 items-center justify-center ${className}`}
      aria-label={unread ? "未読の通知があります" : "通知"}
    >
      <span className="relative">
        <Bell size={22} strokeWidth={1.8} />
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
        )}
      </span>
      {showLabel && <span className="sr-only">通知</span>}
    </Link>
  );
}
