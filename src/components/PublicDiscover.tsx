import { PublicProblemFeed } from "@/components/PublicProblemFeed";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import Link from "next/link";

export function PublicDiscover({ problems }: { problems: PublicProblemPreview[] }) {
  return (
    <main className="min-w-0 max-w-full overflow-x-hidden pb-10">
      <header className="border-b border-gray-800 px-4 py-5">
        <p className="text-sm font-bold text-aha">Qraft（クラフト）</p>
        <h1 className="mt-1 text-xl font-black">Discover</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#c5cdd6]">
          ひらめきを競う問題SNSの公開フィードです。数学・物理・化学の問題を見つけ、自分で解き、みんなの結果や解法を楽しめます。未ログインでも問題文を読めます。解く・保存・フォロー・リアクションにはログインが必要です。
        </p>
      </header>
      {problems.length === 0 ? (
        <section className="px-4 py-8" aria-label="公開問題はありません">
          <p className="text-sm font-bold text-white">いま表示できる公開問題はありません</p>
          <p className="mt-3 text-sm leading-relaxed text-[#c5cdd6]">
            Discoverでは、公開時刻を迎えた通常の問題だけが並びます。公開前のPULSEや未公開投稿はここには出ません。ログインすると、権限のある問題・検索・フォローが使えます。
          </p>
          <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-sky-400">
            ログイン
          </Link>
        </section>
      ) : (
        <PublicProblemFeed problems={problems} compact />
      )}
      {problems.length > 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          検索・フォロー・週次ランキングは{" "}
          <Link href="/login" className="font-bold text-sky-400">
            ログイン後
          </Link>
          に利用できます。
        </p>
      ) : null}
    </main>
  );
}
