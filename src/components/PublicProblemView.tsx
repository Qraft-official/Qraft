import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import Link from "next/link";

export function PublicProblemView({ preview }: { preview: PublicProblemPreview | null }) {
  if (!preview) {
    return (
      <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-10">
        <h1 className="text-lg font-black">この問題は公開されていません</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          非公開、公開前のPULSE、または存在しない問題です。答え・解説・秘密情報は表示しません。
        </p>
        <Link href="/discover" className="mt-6 inline-block min-h-11 text-sm font-bold text-sky-400">
          公開中の問題を見る
        </Link>
      </main>
    );
  }

  const hasContent = Boolean(preview.title.trim() || preview.body.trim() || preview.photo || preview.pages?.length);

  return (
    <main className="min-w-0 max-w-full overflow-x-hidden pb-10">
      <div className="border-b border-gray-800 px-4 py-4">
        <Link href="/discover" className="text-sm font-bold text-muted">
          ← Discover
        </Link>
        <p className="mt-3 text-sm leading-relaxed text-[#c5cdd6]">
          Qraftはひらめきを競う問題SNSです。面白い問題を見つけ、自分で解き、みんなの結果や解法を楽しめます。このページでは公開中の問題文だけを表示しています。
        </p>
      </div>
      <PublicProblemCard preview={preview} />
      <section className="border-b border-gray-800 px-4 py-5">
        <p className="text-sm leading-relaxed text-[#c5cdd6]">
          解答の投稿、リアクション、保存、フォロー、答えや解説の操作はログイン後に利用できます。公開前のPULSEや秘密情報はこのHTMLには含まれません。
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
      <GoogleAdSlot enabled={hasContent} />
    </main>
  );
}
