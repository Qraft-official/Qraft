"use client";

import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X } from "lucide-react";

export function PremiumModal() {
  const {
    premiumOpen,
    closePremium,
    hasPremium,
    isDeveloper,
    subscribed,
    subscribe,
    unsubscribe,
  } = useApp();

  return (
    <AnimatePresence>
      {premiumOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePremium}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-amber-500/30 bg-black p-4 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 text-lg font-black">
                  <Crown size={20} className="text-amber-400" />
                  Aha! Premium
                </p>
                <p className="mt-1 text-sm text-muted">月額 ¥{PREMIUM_PRICE_JPY} · いつでも解約可</p>
              </div>
              <button onClick={closePremium} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>

            {isDeveloper && (
              <p className="mb-3 rounded-2xl border border-aha/40 bg-aha/10 px-3 py-2 text-xs font-bold text-aha">
                開発者アカウント — 全 Premium 機能が永久無料
              </p>
            )}
            {hasPremium && !isDeveloper && (
              <p className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
                加入中 · 10大特典がすべて有効です
              </p>
            )}

            <div className="mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-600/20 to-aha/10 p-4">
              <p className="text-3xl font-black">
                ¥{PREMIUM_PRICE_JPY}
                <span className="ml-1 text-sm font-medium text-muted">/ 月</span>
              </p>
              <p className="mt-1 text-xs text-muted">STEM求解者向けの限定特典パック</p>
            </div>

            <p className="mb-2 text-xs font-bold tracking-wide text-muted">プレミアム10大特典</p>
            <div className="space-y-2">
              {PREMIUM_PERKS.map((p) => (
                <div
                  key={p.title}
                  className="flex gap-3 rounded-2xl border border-gray-800 bg-panel px-3 py-2.5"
                >
                  <span className="text-lg">{p.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{p.title}</p>
                    <p className="text-[11px] text-muted">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {!hasPremium && (
              <button
                onClick={subscribe}
                className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black"
              >
                ¥{PREMIUM_PRICE_JPY}/月で加入する
              </button>
            )}
            {hasPremium && !isDeveloper && subscribed && (
              <button
                onClick={unsubscribe}
                className="mt-5 w-full rounded-full border border-gray-700 py-3 text-sm font-bold text-muted"
              >
                サブスクを解約（デモ）
              </button>
            )}
            {isDeveloper && (
              <p className="mt-5 text-center text-[11px] text-muted">
                決済は不要です。開発者は常に Premium 相当です。
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PaywallModal() {
  const { paywallOpen, paywallReason, closePaywall, openPremium, subscribe, isDeveloper } =
    useApp();

  return (
    <AnimatePresence>
      {paywallOpen && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/75 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePaywall}
        >
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl border border-amber-500/40 bg-black p-5 sm:rounded-3xl"
          >
            <p className="text-lg font-black">Aha! Premium が必要です</p>
            <p className="mt-2 text-sm text-muted">{paywallReason}</p>
            <p className="mt-3 text-2xl font-black text-amber-300">月額 ¥{PREMIUM_PRICE_JPY}</p>
            {isDeveloper ? (
              <p className="mt-3 text-xs text-aha">開発者は無料で利用できます。</p>
            ) : (
              <div className="mt-4 grid gap-2">
                <button
                  onClick={subscribe}
                  className="rounded-full bg-amber-400 py-3 text-sm font-black text-black"
                >
                  ¥{PREMIUM_PRICE_JPY}/月で解除する
                </button>
                <button
                  onClick={() => {
                    closePaywall();
                    openPremium();
                  }}
                  className="rounded-full border border-gray-700 py-3 text-sm font-bold"
                >
                  10大特典を見る
                </button>
              </div>
            )}
            <button onClick={closePaywall} className="mt-3 w-full py-2 text-xs text-muted">
              閉じる
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
