"use client";

import { savePendingReferralCode } from "@/lib/device-id";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const normalized = decodeURIComponent(code || "").trim().toUpperCase();

  useEffect(() => {
    if (normalized) savePendingReferralCode(normalized);
  }, [normalized]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-3xl font-black text-aha">Qraft</p>
      <h1 className="mt-4 text-xl font-black">友達紹介で半額キャンペーン</h1>
      <p className="mt-2 text-sm text-muted">
        このリンク経由で登録すると、紹介キャンペーンの対象になります。招待コード:
        <span className="ml-1 font-mono font-black text-white">{normalized || "—"}</span>
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-[13px] text-[#c5cdd6]">
        <li>専用リンクから2人招待</li>
        <li>公式Xをフォロー（アプリ内ボタン）</li>
        <li>指定ポストをリポスト＆いいね（アプリ内ボタン）</li>
      </ul>
      <Link
        href={`/?ref=${encodeURIComponent(normalized)}`}
        className="mt-6 rounded-full bg-aha py-3 text-center text-sm font-black text-black"
      >
        登録 / ログインしてはじめる
      </Link>
    </div>
  );
}
