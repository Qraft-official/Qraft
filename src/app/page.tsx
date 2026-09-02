"use client";

import { IosNotice } from "@/components/IosNotice";
import { NotificationBell } from "@/components/NotificationBell";
import { PostCard } from "@/components/PostCard";
import { SprintBanner } from "@/components/SprintBanner";
import { TimelineAd } from "@/components/TimelineAd";
import { ReferralCampaignBanner } from "@/components/ReferralCampaignBanner";
import { useApp } from "@/lib/store";
import { inferUserLevel } from "@/lib/difficulty";
import { sortRecommended } from "@/lib/recommend";
import type { FeedTab } from "@/lib/types";
import { PULSE_BLURB, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { Crown } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

export default function HomePage() {
  const {
    posts,
    follows,
    me,
    officialPost,
    sprintUnlocked,
    community,
    reposts,
    hasPremium,
    openPremium,
    openPaywall,
    loungePosts,
    openComposer,
  } = useApp();
  const [tab, setTab] = useState<FeedTab>("foryou");

  const tabs: { id: FeedTab; label: string }[] = [
    { id: "foryou", label: "おすすめ" },
    { id: "following", label: "フォロー中" },
    { id: "sprint", label: "PULSE" },
    { id: "lounge", label: "🏠 Lounge" },
  ];

  const myId = me.id;
  const feed = useMemo(() => {
    const others = posts.filter((p) => p.authorId !== myId);
    if (tab === "following") {
      const followed = others.filter(
        (p) => p.kind !== "reply" && follows.includes(p.authorId),
      );
      const boosted = others.filter(
        (p) =>
          p.kind !== "reply" &&
          reposts.includes(p.id) &&
          !followed.some((x) => x.id === p.id),
      );
      return [...boosted, ...followed];
    }
    if (tab === "sprint") {
      const fromDb = posts.filter((p) => p.isSprint || p.kind === "sprint");
      if (fromDb.length) {
        const rest = sprintUnlocked ? community.filter((c) => !fromDb.some((d) => d.id === c.id)) : [];
        return [...fromDb, ...rest];
      }
      const extra = sprintUnlocked ? community : [];
      return [officialPost, ...extra];
    }
    if (tab === "lounge") return loungePosts;
    const pool = others.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    const level = inferUserLevel(me.tiers, posts, myId);
    return sortRecommended(pool, level);
  }, [tab, posts, follows, myId, officialPost, sprintUnlocked, community, reposts, loungePosts, me.tiers]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-3">
          <NotificationBell className="text-white" />
          <h1 className="text-lg font-black tracking-tight">
            Qraft<span className="ml-1 text-aha">クラフト</span>
          </h1>
          <button
            onClick={openPremium}
            className="flex items-center gap-1 rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-bold text-amber-300"
          >
            <Crown size={12} />
            {hasPremium ? "Premium" : `¥${PREMIUM_PRICE_JPY}`}
          </button>
        </div>
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === "lounge" && !hasPremium) {
                  openPaywall(`プライベートコミュニティは Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です。`);
                  return;
                }
                setTab(t.id);
              }}
              className={`relative flex-1 py-3 text-[11px] font-semibold sm:text-sm ${
                tab === t.id ? "text-white" : "text-muted"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-neon sm:inset-x-8" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="border-b border-gray-800 px-4 py-3">
        <IosNotice />
      </div>

      <SprintBanner />

      {tab === "foryou" && (
        <div className="px-4 py-3">
          <ReferralCampaignBanner />
        </div>
      )}

      {hasPremium && tab === "foryou" && (
        <div className="border-b border-amber-500/20 bg-amber-400/5 px-4 py-3">
          <p className="text-xs font-bold text-amber-200">🎪 Premium限定イベント</p>
          <p className="mt-1 text-sm">先行デイリーチャレンジ：対称式の最速エレガント解</p>
          <p className="mt-1 text-[11px] text-muted">一般公開は明日 21:00。今だけ参加できます。</p>
        </div>
      )}

      {tab === "sprint" && (
        <div className="border-b border-gray-800 px-4 py-3">
          <p className="text-xs leading-relaxed text-muted">{PULSE_BLURB}</p>
          <button
            type="button"
            onClick={() => openComposer({ open: true, mode: "problem", isSprint: true })}
            className="mt-3 w-full rounded-full bg-aha py-3 text-sm font-black text-black"
          >
            21時問題を投稿
          </button>
        </div>
      )}
      {tab === "sprint" && !sprintUnlocked && (
        <p className="px-4 py-4 text-sm text-muted">
          挑戦を提出（またはタイムアウト）すると、この日の「みんなの解答」が開放されます。
        </p>
      )}

      {tab === "lounge" && hasPremium && (
        <p className="border-b border-gray-800 px-4 py-3 text-xs text-muted">
          Premium 求解者だけのフィードです。
        </p>
      )}

      {feed.map((p, i) => (
        <Fragment key={p.id}>
          <PostCard
            post={p}
            showRepostLabel={reposts.includes(p.id) && p.authorId !== me.id}
          />
          {!hasPremium && tab === "foryou" && (i + 1) % 4 === 0 && <TimelineAd />}
        </Fragment>
      ))}
    </div>
  );
}
