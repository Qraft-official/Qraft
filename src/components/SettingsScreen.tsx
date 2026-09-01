"use client";

import { FeedbackEntryButton } from "@/components/FeedbackModal";
import { IosNotice } from "@/components/IosNotice";
import { PremiumCheckoutButton } from "@/components/PremiumCheckoutButton";
import { PremiumDevMessage } from "@/components/PremiumDevMessage";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { ReferralInviteCard, WelcomeMissionCard } from "@/components/ReferralCards";
import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { useApp } from "@/lib/store";
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SETTINGS_TABS = [
  { id: "account", label: "アカウント設定", hint: "名前・所属・年齢", icon: UserRound },
  { id: "referral", label: "友達紹介・キャンペーン", hint: "半額特典", icon: Gift },
  { id: "plan", label: "プラン・お支払い", hint: "Premium", icon: CreditCard },
  { id: "notifications", label: "通知設定", hint: "プッシュ・メール", icon: Bell },
  { id: "about", label: "アプリ情報・利用規約", hint: "規約・お問い合わせ", icon: FileText },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

function asTab(value: string | null): SettingsTabId {
  return SETTINGS_TABS.some((t) => t.id === value) ? (value as SettingsTabId) : "account";
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-panel px-4 py-3">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-aha" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-black transition ${
            on ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function usePref(key: string, fallback = true) {
  const [on, setOn] = useState(fallback);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      setOn(JSON.parse(raw) === true);
    } catch {
      /* ignore */
    }
  }, [key]);
  return [
    on,
    (v: boolean) => {
      setOn(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
  ] as const;
}

export function SettingsScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const tab = asTab(search.get("tab"));
  const { hasPremium, isDeveloper, openPremium, subscribed, unsubscribe } = useApp();
  const [pushOn, setPushOn] = usePref("qraft.notifyPush", true);
  const [mailOn, setMailOn] = usePref("qraft.notifyEmail", true);

  const select = (id: SettingsTabId) => {
    router.replace(`/settings?tab=${id}`, { scroll: false });
  };

  const current = SETTINGS_TABS.find((t) => t.id === tab) ?? SETTINGS_TABS[0];

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-black/85 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full px-2 py-1 text-sm text-muted hover:text-white">
            ← プロフィール
          </Link>
          <h1 className="text-lg font-black">設定</h1>
        </div>
      </header>

      <div className="lg:flex lg:min-h-[70dvh]">
        <nav className="shrink-0 border-b border-gray-800 lg:w-64 lg:border-b-0 lg:border-r">
          <ul className="p-2">
            {SETTINGS_TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === tab;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => select(t.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "border border-aha/40 bg-aha/10"
                        : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-aha" : "text-muted"} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-bold ${active ? "text-white" : "text-[#e7e9ea]"}`}>
                        {t.label}
                      </span>
                      <span className="block text-[11px] text-muted">{t.hint}</span>
                    </span>
                    <ChevronRight size={16} className="text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 px-4 py-4">
          <p className="mb-4 text-base font-black">{current.label}</p>

          {tab === "account" && (
            <div className="rounded-2xl border border-gray-800 bg-panel/40 p-4">
              <ProfileEditForm />
            </div>
          )}

          {tab === "referral" && (
            <div className="space-y-3">
              <ReferralInviteCard />
              <WelcomeMissionCard />
            </div>
          )}

          {tab === "plan" && (
            <div className="space-y-3">
              {isDeveloper && (
                <p className="rounded-2xl border border-aha/40 bg-aha/10 px-3 py-2 text-xs font-bold text-aha">
                  開発者アカウント — 全 Premium 機能が永久無料
                </p>
              )}
              {hasPremium && !isDeveloper && (
                <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
                  加入中 · 10大特典がすべて有効です
                </p>
              )}
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-600/20 to-aha/10 p-4">
                <p className="text-3xl font-black">
                  ¥{PREMIUM_PRICE_JPY}
                  <span className="ml-1 text-sm font-medium text-muted">/ 月</span>
                </p>
                <p className="mt-1 text-xs text-muted">STEM求解者向けの限定特典パック</p>
              </div>
              <PremiumDevMessage />
              <button
                type="button"
                onClick={openPremium}
                className="w-full rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-200"
              >
                {hasPremium ? "Premium 特典を見る" : "プラン詳細を見る"}
              </button>
              {!hasPremium && !isDeveloper && (
                <PremiumCheckoutButton label="プレミアムプランに登録する" />
              )}
              {subscribed && !isDeveloper && (
                <button
                  type="button"
                  onClick={unsubscribe}
                  className="w-full rounded-2xl border border-gray-800 px-4 py-3 text-sm font-bold text-muted"
                >
                  次回更新を停止（解約）
                </button>
              )}
              <p className="text-xs font-bold tracking-wide text-muted">プレミアム10大特典</p>
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
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-3">
              <ToggleRow
                label="プッシュ通知"
                hint="アプリ内の新着やキャンペーンをお知らせします（この端末に保存）"
                on={pushOn}
                onChange={setPushOn}
              />
              <ToggleRow
                label="メール通知"
                hint="重要な案内を登録メールへ送ります（この端末に保存）"
                on={mailOn}
                onChange={setMailOn}
              />
              <p className="text-[11px] text-muted">
                端末のOS設定で通知がオフの場合、プッシュは届かないことがあります。
              </p>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-3">
              <IosNotice />
              <Link
                href="/terms"
                className="flex items-center justify-between rounded-2xl border border-gray-800 bg-panel px-4 py-3 text-sm font-bold"
              >
                利用規約
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <Link
                href="/privacy"
                className="flex items-center justify-between rounded-2xl border border-gray-800 bg-panel px-4 py-3 text-sm font-bold"
              >
                プライバシーポリシー
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <a
                href="mailto:qraft.study@gmail.com"
                className="flex items-center justify-between rounded-2xl border border-gray-800 bg-panel px-4 py-3 text-sm font-bold"
              >
                お問い合わせ
                <ChevronRight size={16} className="text-muted" />
              </a>
              {(hasPremium || isDeveloper) && (
                <FeedbackEntryButton className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-panel px-3 py-3 text-sm font-bold" />
              )}
              <p className="px-1 text-[11px] text-muted">Qraft · 学習者のための理系SNS</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
