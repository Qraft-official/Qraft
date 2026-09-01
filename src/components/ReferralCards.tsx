"use client";

import { getDeviceId, savePendingReferralCode } from "@/lib/device-id";
import {
  CAMPAIGN_INVITE_TARGET,
  canShowReferralApplyForm,
  formatMissionCountdown,
  inviteUrlFromCode,
  PREMIUM_REFERRAL_HALF_JPY,
  WELCOME_LOGIN_TARGET,
  WELCOME_POSTS_TARGET,
  WELCOME_SOLVES_TARGET,
  X_CAMPAIGN_POST_URL,
  X_FOLLOW_INTENT_URL,
} from "@/lib/referral";
import { shareInvite } from "@/lib/share";
import { useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const HALF_PRICE_LABEL = `プレミアムプランが1か月半額（￥${PREMIUM_REFERRAL_HALF_JPY}）`;

function WelcomeMissionDetailsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl border border-gray-800 bg-black p-4 sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-mission-title"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="welcome-mission-title" className="text-lg font-black">
                Welcome Mission
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-muted"
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-[12px] font-bold text-aha">期限: コード入力から4日以内</p>
            <p className="mt-3 text-[12px] font-black">達成条件</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px]">
              <li>3問解く</li>
              <li>3日間連続ログイン</li>
              <li>3問投稿する</li>
            </ol>
            <p className="mt-3 text-[11px] text-muted">
              3つすべて達成すると、紹介者は{HALF_PRICE_LABEL}になります。次回の購入時または次回の更新時の1か月分に適用されます。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WelcomeMissionText({
  className,
  onOpen,
}: {
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={className ?? "font-black text-aha underline decoration-aha/50 underline-offset-2"}
    >
      Welcome Mission
    </button>
  );
}

export function WelcomeMissionCard({ compact = false }: { compact?: boolean }) {
  const { referralMe, applyReferralCode } = useApp();
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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
          コードを入力すると、3日間プレミアム無料と{" "}
          <WelcomeMissionText onOpen={() => setInfoOpen(true)} /> が始まります（達成期限は4日以内）。
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
        <WelcomeMissionDetailsModal open={infoOpen} onClose={() => setInfoOpen(false)} />
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
          <WelcomeMissionText className="text-sm font-black text-white underline decoration-white/30 underline-offset-2" onOpen={() => setInfoOpen(true)} />
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
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="text-[11px] font-bold text-muted"
          >
            詳細
          </button>
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
      <WelcomeMissionDetailsModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

export function ReferralInviteCard() {
  const { referralMe, recordCampaignTap } = useApp();
  const [copied, setCopied] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [busy, setBusy] = useState<"follow" | "post" | null>(null);
  if (!referralMe?.code) return null;
  const inviteUrl = inviteUrlFromCode(referralMe.code);
  const invited = Math.min(referralMe.inviteSuccessCount ?? 0, CAMPAIGN_INVITE_TARGET);
  const followDone = Boolean(referralMe.xFollowTapped);
  const postDone = Boolean(referralMe.xPostTapped);
  const eligible = Boolean(referralMe.isHalfDiscountEligible || referralMe.pendingDiscount);

  const tapX = async (type: "x_follow" | "x_post", href: string) => {
    setBusy(type === "x_follow" ? "follow" : "post");
    window.open(href, "_blank", "noopener,noreferrer");
    await recordCampaignTap(type);
    setBusy(null);
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
      <p className="text-sm font-black">友達紹介で半額キャンペーン</p>
      <p className="mt-1 text-[11px] text-muted">
        招待した人・された人の両方に、プレミアムが1か月半額（￥{PREMIUM_REFERRAL_HALF_JPY}）になります。判定はアプリ内ボタンのタップで行います。
      </p>
      <ol className="mt-3 space-y-1.5 text-[12px]">
        <li className="flex items-center justify-between gap-2">
          <span>{invited >= CAMPAIGN_INVITE_TARGET ? "✅" : "◻️"} 専用リンクから2人招待</span>
          <span className="text-muted">
            {invited}/{CAMPAIGN_INVITE_TARGET}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>{followDone ? "✅" : "◻️"} 公式Xをフォロー</span>
          <button
            type="button"
            disabled={busy === "follow"}
            onClick={() => void tapX("x_follow", X_FOLLOW_INTENT_URL)}
            className="shrink-0 rounded-full border border-sky-500/40 px-2.5 py-1 text-[11px] font-bold text-sky-300"
          >
            {followDone ? "完了" : "フォローする"}
          </button>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>{postDone ? "✅" : "◻️"} 指定ポストをリポスト＆いいね</span>
          <button
            type="button"
            disabled={busy === "post"}
            onClick={() => void tapX("x_post", X_CAMPAIGN_POST_URL)}
            className="shrink-0 rounded-full border border-sky-500/40 px-2.5 py-1 text-[11px] font-bold text-sky-300"
          >
            {postDone ? "完了" : "ポストを開く"}
          </button>
        </li>
      </ol>
      <div className="mt-3">
        <p className="text-[11px] font-bold text-muted">あなたの招待URL</p>
        <p className="mt-1 break-all rounded-xl border border-gray-700 bg-black px-3 py-2 font-mono text-[11px]">
          {inviteUrl}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="rounded-xl border border-gray-700 bg-black px-3 py-1.5 font-mono text-sm font-black tracking-widest">
            {referralMe.code}
          </p>
          <button
            type="button"
            onClick={() => {
              void shareInvite(inviteUrl).then((res) => {
                if (res.ok && res.method === "copy") {
                  setCopied("招待文とURLをコピーしました");
                  window.setTimeout(() => setCopied(""), 2200);
                } else if (!res.ok && !("aborted" in res && res.aborted)) {
                  setCopied("共有できませんでした。もう一度お試しください");
                  window.setTimeout(() => setCopied(""), 2200);
                }
              });
            }}
            className="rounded-full border border-gray-700 px-3 py-1.5 text-[11px] font-bold"
          >
            友達に共有
          </button>
        </div>
      </div>
      {copied && (
        <p className="mt-2 rounded-full bg-aha/15 px-3 py-1 text-center text-[11px] font-bold text-aha">
          {copied}
        </p>
      )}
      {eligible && (
        <p className="mt-2 text-[11px] font-bold text-amber-300">
          1か月半額クーポンが付与されています（次回購入時または次回更新時）
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted">
        友達がこのコードで{" "}
        <WelcomeMissionText onOpen={() => setInfoOpen(true)} />{" "}
        を4日以内に達成すると、紹介者にも別途 Welcome Mission の半額特典が付きます。
      </p>
      <WelcomeMissionDetailsModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
