"use client";

import { IosNotice } from "@/components/IosNotice";
import { NotificationBell } from "@/components/NotificationBell";
import { PostCard } from "@/components/PostCard";
import { SprintBanner } from "@/components/SprintBanner";
import { AdPost } from "@/components/AdPost";
import { ReferralCampaignBanner } from "@/components/ReferralCampaignBanner";
import { HomeNextStep } from "@/components/HomeNextStep";
import { RevengeBanner } from "@/components/RevengeBanner";
import { EmptyState } from "@/components/UiStates";
import { useApp } from "@/lib/store";
import { inferUserLevel } from "@/lib/difficulty";
import { sortRecommended } from "@/lib/recommend";
import type { FeedTab } from "@/lib/types";
import { AD_FEED_INTERVAL, adForSlot, loadHiddenAdIds } from "@/lib/ads";
import { PREMIUM_PRICE_JPY } from "@/lib/constants";
import { Crown } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

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
  const [hiddenAdIds, setHiddenAdIds] = useState<string[]>([]);
  const [adToast, setAdToast] = useState("");

  useEffect(() => {
    setHiddenAdIds(loadHiddenAdIds());
  }, []);

  const flashAdToast = (msg: string) => {
    setAdToast(msg);
    window.setTimeout(() => setAdToast(""), 2400);
  };

  const tabs: { id: FeedTab; label: string; hint?: string }[] = [
    { id: "foryou", label: "おすすめ" },
    { id: "following", label: "フォロー中" },
    { id: "sprint", label: "PULSE", hint: "毎日21時の共通問題" },
    { id: "lounge", label: "Lounge" },
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
      const ahaFeed = posts.filter(
        (p) =>
          p.problemMode === "aha" &&
          p.kind !== "reply" &&
          p.id !== officialPost.id,
      );
      const extra = sprintUnlocked ? community.filter((c) => !ahaFeed.some((d) => d.id === c.id)) : [];
      return [officialPost, ...ahaFeed, ...extra];
    }
    if (tab === "lounge") return loungePosts;
    const pool = others.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    const level = inferUserLevel(me.tiers, posts, myId);
    return sortRecommended(pool, level);
  }, [tab, posts, follows, myId, officialPost, sprintUnlocked, community, reposts, loungePosts, me.tiers]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 py-2">
          <NotificationBell className="text-white" />
          <h1 className="text-lg font-black tracking-tight">
            Qraft<span className="ml-1 text-aha">クラフト</span>
          </h1>
          <button
            type="button"
            onClick={openPremium}
            aria-label={hasPremium ? "Premium" : `Premium 月額¥${PREMIUM_PRICE_JPY}`}
            className="flex h-11 w-11 items-center justify-center rounded-full text-amber-300"
          >
            <Crown size={18} />
          </button>
        </div>
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === "lounge" && !hasPremium) {
                  openPaywall(`プライベートコミュニティは Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です。`);
                  return;
                }
                setTab(t.id);
              }}
              aria-current={tab === t.id ? "page" : undefined}
              className={`relative min-h-11 flex-1 px-1 py-2 text-xs font-semibold sm:text-sm ${
                tab === t.id ? "text-white" : "text-muted"
              }`}
            >
              <span className="block">{t.label}</span>
              {t.hint && tab === t.id && (
                <span className="mt-0.5 block text-[10px] font-medium text-muted">{t.hint}</span>
              )}
              {tab === t.id && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neon sm:inset-x-6" />
              )}
            </button>
          ))}
        </div>
      </header>

      <IosNotice />

      {tab === "sprint" ? <SprintBanner /> : null}

      {tab === "foryou" && (
        <div className="px-4 pb-1">
          <ReferralCampaignBanner compact />
        </div>
      )}

      {tab === "foryou" && <HomeNextStep />}
      {tab === "foryou" && <RevengeBanner />}

      {hasPremium && tab === "foryou" && (
        <p className="px-4 py-1.5 text-xs text-amber-200/80">Premium限定イベント · 先行デイリーチャレンジ開催中</p>
      )}

      {tab === "sprint" && (
        <div className="border-b border-gray-800 px-4 py-2">
          <button
            type="button"
            onClick={() => openComposer({ open: true, mode: "problem", isSprint: true })}
            className="min-h-11 w-full rounded-full bg-aha text-sm font-black text-black"
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
        <p className="border-b border-gray-800 px-4 py-2 text-xs text-muted">
          Lounge · Premium 求解者だけのフィード
        </p>
      )}

      {feed.length === 0 ? (
        tab === "following" ? (
          <EmptyState
            title="フォロー中の投稿はまだありません"
            body="Discover でユーザーを探してフォローすると、ここに問題が並びます。"
            actionHref="/discover?view=users"
            actionLabel="ユーザーを探す"
          />
        ) : tab === "lounge" && !hasPremium ? (
          <EmptyState
            title="Lounge は Premium 限定です"
            body="求解者コミュニティのフィードを見るには Premium が必要です。"
            onAction={() => openPaywall(`プライベートコミュニティは Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です。`)}
            actionLabel="内容を見る"
          />
        ) : (
          <EmptyState
            title="まだ問題がありません"
            body="最初の問題を投稿して、Qraft を始めましょう。"
            onAction={() => openComposer({ open: true, mode: "problem" })}
            actionLabel="問題を投稿"
          />
        )
      ) : (
        feed.map((p, i) => (
          <Fragment key={p.id}>
            <PostCard
              post={p}
              showRepostLabel={reposts.includes(p.id) && p.authorId !== me.id}
            />
            {!hasPremium && tab === "foryou" && (i + 1) % AD_FEED_INTERVAL === 0 && (
              <FeedAd
                slot={Math.floor((i + 1) / AD_FEED_INTERVAL) - 1}
                hiddenAdIds={hiddenAdIds}
                onHidden={(id) => setHiddenAdIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                onHideToast={() => flashAdToast("広告を非表示にしました")}
                onReport={() => flashAdToast("報告を受け付けました")}
              />
            )}
          </Fragment>
        ))
      )}
      {adToast && (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold text-black shadow-xl"
          role="status"
        >
          {adToast}
        </div>
      )}
    </div>
  );
}

function FeedAd({
  slot,
  hiddenAdIds,
  onHidden,
  onHideToast,
  onReport,
}: {
  slot: number;
  hiddenAdIds: string[];
  onHidden: (id: string) => void;
  onHideToast: () => void;
  onReport: () => void;
}) {
  const ad = adForSlot(slot, hiddenAdIds);
  if (!ad) return null;
  return (
    <AdPost
      ad={ad}
      onHidden={onHidden}
      onReport={() => onReport()}
      onHideStart={onHideToast}
    />
  );
}
