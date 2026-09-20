import { CANONICAL_ORIGIN, PULSE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Qraftについて",
  description:
    "Qraftは数学・物理・化学の問題を投稿し、他の人の問題に挑戦し、解法を共有する問題SNSです。Aha、Challenger、毎日21時のPULSEがあります。",
  alternates: { canonical: `${CANONICAL_ORIGIN}/about` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Qraftについて | Qraft",
    description:
      "Qraftは数学・物理・化学の問題を投稿し、他の人の問題に挑戦し、解法を共有する問題SNSです。Aha、Challenger、毎日21時のPULSEがあります。",
    siteName: "Qraft",
    type: "website",
    locale: "ja_JP",
    url: `${CANONICAL_ORIGIN}/about`,
  },
};

export default function AboutPage() {
  return (
    <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-8">
      <p className="text-sm font-bold tracking-wide text-aha">Qraft（クラフト）</p>
      <h1 className="mt-2 text-2xl font-black text-white">Qraftについて</h1>
      <p className="mt-4 text-sm leading-relaxed text-[#c5cdd6]">{SITE_DESCRIPTION}</p>

      <section className="mt-8">
        <h2 className="text-lg font-black">できること</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#c5cdd6]">
          <li>数学・物理・化学の学習問題を投稿できます。</li>
          <li>他のユーザーの問題に挑戦できます。</li>
          <li>自分の解法を投稿して共有できます。</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black">モード</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-[#c5cdd6]">
          <li>
            <span className="font-black text-white">Aha!</span>
            <span className="mt-1 block">小学校までの知識でも楽しめる、ひらめき・パズル寄りの問題です。</span>
          </li>
          <li>
            <span className="font-black text-white">Challenger</span>
            <span className="mt-1 block">出題者が正解を設定し、挑戦者が答えを送って採点される問題です。</span>
          </li>
          <li>
            <span className="font-black text-white">{PULSE_NAME}</span>
            <span className="mt-1 block">毎日21時に配信される限定の一問です。公開後の問題文はサイト上で読めます。</span>
          </li>
        </ul>
      </section>

      <p className="mt-8 text-sm text-muted">
        公開中の問題は未ログインでも読めます。解答・投稿・リアクションにはアカウントが必要です。
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/discover"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 px-5 text-sm font-bold"
        >
          公開問題を見る
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-sky-400"
        >
          お問い合わせ
        </Link>
      </div>
    </main>
  );
}
