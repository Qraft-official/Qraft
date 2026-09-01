"use client";

import { getDeviceId, savePendingReferralCode } from "@/lib/device-id";
import {
  canShowReferralApplyForm,
  formatMissionCountdown,
  WELCOME_LOGIN_TARGET,
  WELCOME_POSTS_TARGET,
  WELCOME_SOLVES_TARGET,
} from "@/lib/referral";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function WelcomeMissionCard({ compact = false }: { compact?: boolean }) {
  const { referralMe, applyReferralCode } = useApp();
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const claim = referralMe?.claim;
  const clock = useMemo(
    () => (claim ? formatMissionCountdown(claim.missionDeadline, now) : null),
    [claim, now],
  );

  if (!referralMe) return null;

  if (!claim) {
    if (!canShowReferralApplyForm(referralMe, now)) return null;
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-400/5 px-4 py-3">
        <p className="text-sm font-black">友達紹介コード</p>
        <p className="mt-1 text-[11px] text-muted">
          コードを入力すると、3日間プレミアム無料と Welcome Mission が始まります（達成期限は4日以内）。
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="紹介コード"
            className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={() => {
              setBusy(true);
              setError("");
              savePendingReferralCode(code);
              void applyReferralCode(code.trim(), getDeviceId()).then((res) => {
                setBusy(false);
                if (res.error) setError(res.error);
                else setCode("");
              });
            }}
            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:opacity-40"
          >
            適用
          </button>
        </div>
        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      </div>
    );
  }

  const items = [
    { label: "3問解く", done: claim.solves, target: WELCOME_SOLVES_TARGET },
    { label: "3日間連続ログイン", done: claim.loginStreak, target: WELCOME_LOGIN_TARGET },
    { label: "3問投稿する", done: claim.posts, target: WELCOME_POSTS_TARGET },
  ];
  const expired = Boolean(claim.expiredAt) || Boolean(clock?.expired);
  const completed = Boolean(claim.completedAt);

  return (
    <div className="rounded-2xl border border-aha/40 bg-aha/5 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black">Welcome Mission</p>
          {clock && (
            <p className={`mt-1 text-[11px] font-bold ${expired ? "text-red-400" : "text-aha"}`}>
              {completed
                ? "達成済み"
                : expired
                  ? "期限切れ（紹介者への半額特典は付与されません）"
                  : `${clock.remainingLabel} · ${clock.deadlineLabel}まで`}
            </p>
          )}
        </div>
        {!compact && (
          <Link href="/welcome-mission" className="text-[11px] font-bold text-muted">
            詳細
          </Link>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => {
          const ok = it.done >= it.target;
          return (
            <li key={it.label} className="flex items-center justify-between text-[12px]">
              <span className={ok ? "text-aha" : "text-white"}>
                {ok ? "✅" : "◻️"} {it.label}
              </span>
              <span className="text-muted">
                {Math.min(it.done, it.target)}/{it.target}
              </span>
            </li>
          );
        })}
      </ul>
      {referralMe.trialUntil && new Date(referralMe.trialUntil).getTime() > now && (
        <p className="mt-2 text-[11px] text-amber-300">プレミアム体験中（3日間）</p>
      )}
    </div>
  );
}

export function ReferralInviteCard() {
  const { referralMe } = useApp();
  const [copied, setCopied] = useState(false);
  if (!referralMe?.code) return null;
  return (
    <div className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
      <p className="text-sm font-black">あなたの紹介コード</p>
      <p className="mt-1 text-[11px] text-muted">
        友達がこのコードで Welcome Mission を4日以内に達成すると、翌月のプレミアムが半額（¥200）になります。
      </p>
      <div className="mt-2 flex items-center gap-2">
        <p className="rounded-xl border border-gray-700 bg-black px-3 py-2 font-mono text-lg font-black tracking-widest">
          {referralMe.code}
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(referralMe.code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-full border border-gray-700 px-3 py-1.5 text-[11px] font-bold"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      {referralMe.pendingDiscount && (
        <p className="mt-2 text-[11px] font-bold text-amber-300">翌月半額クーポンが付与されています</p>
      )}
    </div>
  );
}
