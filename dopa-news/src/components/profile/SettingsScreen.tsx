"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Moon, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/navigation/TopBar";
import BottomSheet from "@/components/ui/BottomSheet";
import Toggle from "@/components/ui/Toggle";
import { EmptyState, Spinner } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { NEWS_CATEGORIES } from "@/lib/categories";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type NotificationKey =
  | "notify_breaking"
  | "notify_local_emergency"
  | "notify_vote_result"
  | "notify_important"
  | "notify_map_nearby";

const NOTIFICATION_ROWS: { key: NotificationKey; label: string; help: string }[] = [
  { key: "notify_breaking", label: "速報", help: "大きなニュースが入ったとき" },
  {
    key: "notify_local_emergency",
    label: "自分の地域の緊急情報",
    help: "登録した地域の緊急投稿・警報",
  },
  { key: "notify_vote_result", label: "投票したニュースの結果", help: "予想の答え合わせができたとき" },
  { key: "notify_important", label: "重要ニュース", help: "生活に影響が大きい話題" },
  { key: "notify_map_nearby", label: "ドパマップ周辺情報", help: "近くで報告が急増したとき" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  // Toggles apply instantly on top of the saved profile and roll back if the
  // write fails, so the switches never lag behind the tap.
  const [pending, setPending] = useState<Partial<Profile>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const draft: Profile | null = profile ? { ...profile, ...pending } : null;

  const persist = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;
      setPending((prev) => ({ ...prev, ...patch }));
      const { error } = await getSupabase().from("profiles").update(patch).eq("id", user.id);
      if (error) {
        setPending((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(patch)) delete next[key as keyof Profile];
          return next;
        });
        toast("設定を保存できませんでした", "error");
        return;
      }
      await refreshProfile();
      setPending((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(patch)) delete next[key as keyof Profile];
        return next;
      });
    },
    [user, refreshProfile, toast],
  );

  async function handleSignOut() {
    await signOut();
    toast("ログアウトしました", "info");
    router.replace("/");
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await getSupabase().rpc("delete_my_account");
      if (error) throw error;
      await signOut();
      toast("アカウントを削除しました", "info");
      router.replace("/");
    } catch {
      toast("アカウントを削除できませんでした", "error");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (loading) {
    return (
      <main className="pad-nav min-h-dvh">
        <PageHeader title="設定" backHref="/me" />
        <div className="grid min-h-[50dvh] place-items-center text-fg-faint">
          <Spinner size={22} />
        </div>
      </main>
    );
  }

  if (!user || !draft) {
    return (
      <main className="pad-nav min-h-dvh">
        <PageHeader title="設定" backHref="/me" />
        <div className="px-4 pt-8">
          <EmptyState
            title="ログインすると設定を変更できます"
            description="通知や位置情報の設定はアカウントごとに保存されます。"
            action={
              <Link
                href="/login?next=/me/settings"
                className="grad-cta rounded-full px-5 py-2.5 text-[13px] font-black text-[#07121a]"
              >
                ログイン
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const selectedCategories = new Set(draft.preferred_categories);

  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader title="設定" backHref="/me" />

      <div className="space-y-5 px-4 pt-4">
        <section>
          <h2 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">通知</h2>
          <div className="card divide-y divide-[color:var(--color-line)]">
            {NOTIFICATION_ROWS.map(({ key, label, help }) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-fg">{label}</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">{help}</p>
                </div>
                <Toggle
                  checked={draft[key]}
                  onChange={(next) => void persist({ [key]: next } as Partial<Profile>)}
                  label={label}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 px-0.5 text-[10.5px] leading-relaxed text-fg-faint">
            必要な通知だけを選べます。通知が多すぎると感じたら、いつでもオフにできます。
          </p>
        </section>

        <section>
          <h2 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">位置情報</h2>
          <div className="card px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-fg">ドパマップで現在地を使う</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
                  オフにすると地図は東京都心から始まります。投稿するときは、その都度あらためて許可を求めます。
                </p>
              </div>
              <Toggle
                checked={draft.allow_location}
                onChange={(next) => void persist({ allow_location: next })}
                label="位置情報を使う"
              />
            </div>
            <p className="mt-3 rounded-xl bg-white/[0.035] px-3 py-2.5 text-[10.5px] leading-relaxed text-fg-faint">
              投稿の座標は約100m単位に丸めて保存され、現在地そのものが他のユーザーに公開されることはありません。公開されるのは「投稿した場所」だけで、継続的な位置の追跡は行いません。
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">
            よく見るニュースカテゴリ
          </h2>
          <div className="card p-3.5">
            <div className="flex flex-wrap gap-1.5">
              {NEWS_CATEGORIES.map((category) => {
                const active = selectedCategories.has(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? draft.preferred_categories.filter((c) => c !== category.id)
                        : [...draft.preferred_categories, category.id];
                      void persist({ preferred_categories: next });
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                      active
                        ? "border-[#4ef5a3]/55 bg-[#4ef5a3]/12 text-[#4ef5a3]"
                        : "border-line text-fg-muted active:bg-white/5"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10.5px] text-fg-faint">
              選んだカテゴリは通知や今後のおすすめの参考に使われます。
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">外観</h2>
          <div className="card flex items-center gap-3 px-4 py-3.5">
            <Moon size={17} className="text-[#a98bff]" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-fg">ダークモード</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
                ドパニュースは常にダークで表示されます。夜でも見やすいことを前提に配色を設計しているためです。
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">アカウント</h2>
          <div className="space-y-2">
            <Link
              href="/about"
              className="card flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold active:bg-ink-700"
            >
              ニュースの作り方・情報源について
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
            <Link
              href="/terms"
              className="card flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold active:bg-ink-700"
            >
              利用規約
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
            <Link
              href="/privacy"
              className="card flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold active:bg-ink-700"
            >
              プライバシーポリシー
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="card flex w-full items-center gap-3 px-4 py-3.5 text-[14px] font-semibold text-fg active:bg-ink-700"
            >
              <LogOut size={17} className="text-fg-muted" />
              ログアウト
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex w-full items-center gap-3 rounded-[20px] border border-[#ff5c7a]/30 bg-[#ff5c7a]/[0.06] px-4 py-3.5 text-[14px] font-semibold text-[#ff5c7a] active:bg-[#ff5c7a]/10"
            >
              <Trash2 size={17} />
              アカウントを削除
            </button>
          </div>
        </section>

        <p className="pb-2 text-center text-[10.5px] text-fg-faint">
          ドパニュース（Dopa News）・開発用サンプルデータを含みます
        </p>
      </div>

      <BottomSheet
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="アカウントを削除しますか？"
        subtitle="保存したニュース、投票、ドパマップの投稿はすべて削除され、元に戻せません。"
      >
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff5c7a] py-3.5 text-[15px] font-black text-[#12060a] active:opacity-90 disabled:opacity-60"
          >
            {deleting && <Spinner size={16} />}
            削除する
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="w-full rounded-2xl border border-line-strong py-3.5 text-[15px] font-bold text-fg active:bg-white/10"
          >
            キャンセル
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}
