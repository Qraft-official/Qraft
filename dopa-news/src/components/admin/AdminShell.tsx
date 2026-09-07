"use client";

import Link from "next/link";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState, Spinner } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";

/**
 * Admin screens are gated in the UI for clarity, but the real protection is
 * the `is_admin()` check inside every RLS policy on the server.
 */
export default function AdminShell({
  title,
  backHref = "/admin",
  right,
  children,
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { user, profile, loading } = useSession();

  return (
    <main className="min-h-dvh pb-16">
      <header className="glass sticky top-0 z-50 border-b border-line pad-safe-top">
        <div className="flex h-[52px] items-center gap-2 px-2">
          <Link
            href={backHref}
            aria-label="戻る"
            className="grid h-10 w-10 place-items-center rounded-full text-fg-muted active:bg-white/10"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15.5px] font-bold">{title}</h1>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#a98bff]">ADMIN</p>
          </div>
          {right}
        </div>
      </header>

      {loading ? (
        <div className="grid min-h-[60dvh] place-items-center text-fg-faint">
          <Spinner size={22} />
        </div>
      ) : !user ? (
        <div className="px-4 pt-8">
          <EmptyState
            icon={<Lock size={24} />}
            title="管理画面にはログインが必要です"
            action={
              <Link
                href="/login?next=/admin"
                className="grad-cta rounded-full px-5 py-2.5 text-[13px] font-black text-[#07121a]"
              >
                ログイン
              </Link>
            }
          />
        </div>
      ) : !profile?.is_admin ? (
        <div className="px-4 pt-8">
          <EmptyState
            icon={<ShieldAlert size={24} />}
            title="管理者権限がありません"
            description="このアカウントでは管理画面を利用できません。"
            action={
              <Link
                href="/"
                className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-bold text-fg"
              >
                トップに戻る
              </Link>
            }
          />
        </div>
      ) : (
        children
      )}
    </main>
  );
}
