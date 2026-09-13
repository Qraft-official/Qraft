import { PublicProblemFeed } from "@/components/PublicProblemFeed";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import Link from "next/link";

export function PublicLanding({ problems }: { problems: PublicProblemPreview[] }) {
  return (
    <main className="min-w-0 max-w-full overflow-x-hidden pb-10">
      <section className="border-b border-gray-800 px-4 py-8">
        <p className="text-sm font-bold tracking-wide text-aha">Qraft（クラフト）</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-white">
          ひらめきを競う問題SNS
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#c5cdd6]">
          Qraftは、数学・物理・化学の面白い問題を見つけ、自分で解き、みんなの結果や解法を楽しむための場所です。タイムラインの感想ではなく、問題そのものが主役です。
        </p>
      </section>

      <section className="border-b border-gray-800 px-4 py-6">
        <h2 className="text-lg font-black">Qraftとは</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#c5cdd6]">
          出題者がオリジナル問題を投稿し、解答者が教えてQrafter!、Challenger、Aha!、毎日21時のPULSEといったモードで挑みます。解けたら結果が見え、他の人の解法を読んで「そういう手があったか」と楽しめます。
        </p>
      </section>

      <section className="border-b border-gray-800 px-4 py-6">
        <h2 className="text-lg font-black">体験の流れ</h2>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-[#c5cdd6]">
          <li>
            <span className="font-black text-aha">1. 解く</span>
            <span className="mt-1 block">Discoverやトップの公開問題から、自分のレベルに合う一問を開きます。</span>
          </li>
          <li>
            <span className="font-black text-aha">2. 結果を見る</span>
            <span className="mt-1 block">提出後に正誤やかかった時間など、その問題の結果が分かります。</span>
          </li>
          <li>
            <span className="font-black text-aha">3. 他人の解法を見る</span>
            <span className="mt-1 block">同じ問題に対する別解やコメントを読み、ひらめきを分け合います。</span>
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted">
          解答の投稿、問題の投稿、リアクション、保存、フォローにはログインが必要です。
        </p>
      </section>

      <section className="border-b border-gray-800 px-4 py-6">
        <h2 className="text-lg font-black">Qraft独自の価値</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#c5cdd6]">
          <li>問題と解法がタイムラインの単位になること</li>
          <li>打ち込みと手書きの両方で数式を残せること</li>
          <li>教えてQrafter! / Challenger / Aha! と、毎日21時のPULSEという勝負の時間があること</li>
          <li>答えや解説は見るタイミングを自分で選べること</li>
        </ul>
      </section>

      <section className="px-4 pt-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-black">公開中の問題</h2>
          <Link href="/discover" className="text-sm font-bold text-sky-400">
            Discoverへ
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          未ログインのまま、問題文・教科・難易度・モードを読めます。公開前のPULSEは表示しません。
        </p>
      </section>

      {problems.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted">
          いま表示できる公開問題がありません。ログインすると、権限のある問題を閲覧できます。
        </p>
      ) : (
        <PublicProblemFeed problems={problems} compact />
      )}

      <section className="px-4 py-8">
        <p className="text-sm leading-relaxed text-[#c5cdd6]">
          解く・投稿する・反応するならアカウントを作成してください。公開中の問題を先に見るだけでも構いません。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 px-5 text-sm font-bold"
          >
            公開問題を見る
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-aha px-5 text-sm font-black text-black"
          >
            アカウント作成
          </Link>
        </div>
      </section>
    </main>
  );
}
