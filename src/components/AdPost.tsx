"use client";

import {
  AD_ACCOUNT_HANDLE,
  AD_ACCOUNT_NAME,
  persistHiddenAdId,
  type InFeedAd,
} from "@/lib/ads";
import { useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Flag, MessageCircle, MoreHorizontal, Repeat2, Share2, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VerifiedBadge } from "./VerifiedBadge";

function AdAvatar() {
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-black tracking-wide text-sky-100"
        style={{ boxShadow: "0 0 0 1px #38bdf855" }}
        aria-hidden
      >
        Ad
      </div>
    </div>
  );
}

export function AdPost({
  ad,
  onHidden,
  onHideStart,
  onReport,
}: {
  ad: InFeedAd;
  onHidden?: (id: string) => void;
  onHideStart?: () => void;
  onReport?: (id: string) => void;
}) {
  const { openPremium } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDoc);
    };
  }, [menuOpen]);

  const onCta = () => {
    if (ad.href === "internal:premium") openPremium();
  };

  const hideAd = () => {
    setMenuOpen(false);
    persistHiddenAdId(ad.id);
    onHideStart?.();
    setVisible(false);
  };

  const reportAd = () => {
    setMenuOpen(false);
    onReport?.(ad.id);
  };

  const ctaClass =
    "mt-3 inline-flex w-full items-center justify-center rounded-full bg-sky-500 py-2 text-sm font-bold text-black";

  return (
    <>
      <AnimatePresence
        onExitComplete={() => {
          onHidden?.(ad.id);
        }}
      >
        {visible && (
          <motion.article
            initial={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, x: 48, marginTop: 0, marginBottom: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden border-b border-gray-800 bg-gradient-to-r from-sky-500/8 to-transparent"
          >
            <div className="px-4 py-3">
              <div className="flex gap-3">
                <AdAvatar />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 text-[15px]">
                        <span className="truncate font-bold text-white">{AD_ACCOUNT_NAME}</span>
                        <VerifiedBadge show tone="blue" />
                        <span className="truncate text-muted">@{AD_ACCOUNT_HANDLE}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                        プロモーション
                      </span>
                      <div className="relative" ref={menuRef}>
                        <button
                          type="button"
                          onClick={() => setMenuOpen((v) => !v)}
                          className="rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-white"
                          aria-label="広告メニュー"
                          aria-expanded={menuOpen}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        <AnimatePresence>
                          {menuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-xl border border-gray-800 bg-black shadow-xl"
                            >
                              <button
                                type="button"
                                onClick={hideAd}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              >
                                <Ban size={16} className="shrink-0 text-muted" />
                                この広告をおすすめしない（表示を減らす）
                              </button>
                              <button
                                type="button"
                                onClick={reportAd}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                              >
                                <Flag size={16} className="shrink-0 text-muted" />
                                この広告を報告する
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-white">{ad.body}</p>

                  <div className="mt-2 overflow-hidden rounded-2xl border border-sky-400/25 bg-[#101820]">
                    {ad.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.image} alt="" className="max-h-56 w-full object-cover" />
                    ) : (
                      <div className="flex min-h-[7.5rem] items-center justify-center bg-[linear-gradient(180deg,#15202b_0%,#0b1220_100%)] px-4 py-6">
                        <p className="text-center text-xs font-bold tracking-wide text-sky-200/80">
                          Qraft · Official Ad
                        </p>
                      </div>
                    )}
                  </div>

                  {ad.href === "internal:premium" ? (
                    <button type="button" onClick={onCta} className={ctaClass}>
                      {ad.cta}
                    </button>
                  ) : ad.href.startsWith("http") ? (
                    <a href={ad.href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                      {ad.cta}
                    </a>
                  ) : (
                    <Link href={ad.href} className={ctaClass}>
                      {ad.cta}
                    </Link>
                  )}

                  <div className="mt-3 flex max-w-md items-center justify-between text-muted/50">
                    <span className="flex items-center gap-1 text-xs" aria-hidden>
                      <MessageCircle size={16} /> —
                    </span>
                    <span className="flex items-center gap-1 text-xs" aria-hidden>
                      <Repeat2 size={16} /> —
                    </span>
                    <span className="flex items-center gap-1 text-xs" aria-hidden>
                      <Star size={16} /> —
                    </span>
                    <span className="flex items-center gap-1 text-xs" aria-hidden>
                      <Share2 size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </>
  );
}
