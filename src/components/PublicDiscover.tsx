"use client";

import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { publicProblemHasBody } from "@/lib/public-catalog";
import Link from "next/link";

export function PublicDiscover({ problems }: { problems: PublicProblemPreview[] }) {
  const listed = problems.filter(publicProblemHasBody);
  const adsOk = listed.length >= 3;

  return (
    <main className="pb-10">
      <header className="border-b border-gray-800 px-4 py-5">
        <h1 className="text-xl font-black">Discover</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#c5cdd6]">
          公開中の問題を未ログインのまま閲覧できます。解く・保存・フォロー・リアクションにはログインが必要です。
        </p>
      </header>
      {listed.length === 0 ? (
        <p className="px-4 py-10 text-sm text-muted">表示できる公開問題がありません。</p>
      ) : (
        listed.map((preview) => (
          <PublicProblemCard key={preview.id} preview={preview} href={`/p/${preview.id}`} compact />
        ))
      )}
      <GoogleAdSlot enabled={adsOk} />
      <p className="px-4 py-6 text-sm text-muted">
        検索・フォロー・週次ランキングは{" "}
        <Link href="/login" className="font-bold text-sky-400">
          ログイン後
        </Link>
        に利用できます。
      </p>
    </main>
  );
}
