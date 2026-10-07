import Link from "next/link";

/** Prominent guest-only entry points shown near the top of primary public pages. */
export function PublicResourceNav() {
  return (
    <aside
      className="border-b border-gray-800 bg-gradient-to-b from-[#111827] to-black px-4 py-4"
      aria-label="公開コンテンツ案内"
    >
      <Link
        href="/blog"
        className="group flex min-h-16 items-center justify-between rounded-2xl border border-aha/40 bg-aha/[0.08] px-4 py-3 hover:border-aha hover:bg-aha/[0.12]"
      >
        <span>
          <span className="block text-xs font-bold tracking-wide text-aha">数学・パズル・勉強法</span>
          <span className="mt-1 block text-base font-black text-white">Qraftコラムを見る</span>
        </span>
        <span className="ml-3 text-xl font-black text-aha transition-transform group-hover:translate-x-1" aria-hidden="true">
          →
        </span>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-700 bg-white/[0.03] px-3 text-center text-xs font-bold text-[#c5cdd6] hover:border-gray-500 hover:text-white"
        >
          利用規約を見る
        </Link>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-700 bg-white/[0.03] px-3 text-center text-xs font-bold text-[#c5cdd6] hover:border-gray-500 hover:text-white"
        >
          プライバシーポリシーを見る
        </Link>
      </div>
    </aside>
  );
}
