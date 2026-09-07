import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "オフライン" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-line bg-ink-800 text-fg-muted">
          <WifiOff size={26} />
        </div>
        <h1 className="mt-4 text-[19px] font-black text-fg">通信できません</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-fg-muted">
          電波の届く場所に移動するか、Wi-Fiを確認してからもう一度お試しください。読み込み済みの画面はそのまま見られます。
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-line-strong px-5 py-2.5 text-[13px] font-bold text-fg"
        >
          トップに戻る
        </Link>
      </div>
    </main>
  );
}
