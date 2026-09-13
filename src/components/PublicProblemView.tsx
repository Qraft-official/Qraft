"use client";

import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { publicProblemHasBody } from "@/lib/public-catalog";
import Link from "next/link";

export function PublicProblemView({ preview }: { preview: PublicProblemPreview | null }) {
  if (!preview) {
    return (
      <main className="px-4 py-10">
        <h1 className="text-lg font-black">この問題は公開されていません</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          非公開、公開前のPULSE、または存在しない問題です。答え・解説・秘密情報は表示しません。
        </p>
        <Link href="/discover" className="mt-6 inline-block text-sm font-bold text-sky-400">
          公開中の問題を見る
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-10">
      <div className="border-b border-gray-800 px-4 py-4">
        <Link href="/discover" className="text-sm font-bold text-muted">
          ← Discover
        </Link>
        <h1 className="mt-2 text-xl font-black">問題</h1>
      </div>
      <PublicProblemCard preview={preview} />
      <section className="border-b border-gray-800 px-4 py-5">
        <p className="text-sm leading-relaxed text-[#c5cdd6]">
          この画面では問題文とメタ情報だけを公開しています。解答の投稿、リアクション、保存、フォロー、答えや解説の操作はログイン後に利用できます。PULSEの秘密や未公開の答えはここには含まれません。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?next=/p/${encodeURIComponent(preview.id)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-aha px-5 text-sm font-black text-black"
          >
            ログインして解く
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 px-5 text-sm font-bold"
          >
            ほかの問題
          </Link>
        </div>
      </section>
      <GoogleAdSlot enabled={publicProblemHasBody(preview)} />
    </main>
  );
}
