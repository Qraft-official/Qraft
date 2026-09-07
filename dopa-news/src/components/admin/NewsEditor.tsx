"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Save, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AdminShell from "./AdminShell";
import Toggle from "@/components/ui/Toggle";
import { ErrorState, Spinner } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import type { NewsDraft } from "@/lib/ai/news-draft";
import {
  EMPTY_NEWS_FORM,
  newsToForm,
  saveNews,
  toLocalInput,
  validateNewsForm,
  type NewsFormValues,
} from "@/lib/admin-queries";
import { NEWS_CATEGORIES, SOURCE_TRUST } from "@/lib/categories";
import { fetchArticle } from "@/lib/news-queries";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { QuizOption } from "@/types/database";

const SOURCE_TYPES = ["official", "major_media", "multi_report", "unconfirmed"] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-fg-muted">{label}</span>
      {hint && <span className="mt-0.5 block text-[10.5px] text-fg-faint">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-line bg-ink-700 px-3.5 py-2.5 text-[13.5px] text-fg outline-none placeholder:text-fg-faint focus:border-[#35dcff]/50";

export default function NewsEditor({ newsId }: { newsId?: string }) {
  const router = useRouter();
  const { profile, session } = useSession();
  const { toast } = useToast();

  const [form, setForm] = useState<NewsFormValues>({
    ...EMPTY_NEWS_FORM,
    published_at: toLocalInput(new Date().toISOString()),
  });
  const [loading, setLoading] = useState(Boolean(newsId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sourceText, setSourceText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const isAdmin = Boolean(profile?.is_admin);

  useEffect(() => {
    if (!newsId || !isAdmin || !isSupabaseConfigured) return;
    let active = true;
    void fetchArticle(getSupabase(), newsId)
      .then((article) => {
        if (!active) return;
        if (article) setForm(newsToForm(article));
        else setLoadFailed(true);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [newsId, isAdmin]);

  function patch(next: Partial<NewsFormValues>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  async function handleGenerate() {
    const token = session?.access_token;
    if (!token) {
      toast("ログインし直してください", "error");
      return;
    }
    if (sourceText.trim().length < 80) {
      toast("元記事のテキストを80文字以上貼り付けてください", "error");
      return;
    }
    setGenerating(true);
    setAiNotice(null);
    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: sourceText,
          sourceName: form.source_name,
          sourceUrl: form.source_url,
          title: form.title,
        }),
      });
      const payload = (await response.json()) as {
        draft?: NewsDraft;
        engine?: string;
        notice?: string;
        error?: string;
      };
      if (!response.ok || !payload.draft) {
        toast(payload.error ?? "生成に失敗しました", "error");
        return;
      }
      const draft = payload.draft;
      patch({
        title: draft.title,
        category: draft.category,
        summary: form.summary || draft.three_second_summary,
        what_happened: draft.what_happened,
        why_trending: draft.why_trending,
        three_second_summary: draft.three_second_summary,
        social_reaction_summary: draft.social_reaction_summary,
        quiz_question: draft.quiz.question,
        quiz_option_a: draft.quiz.options[0] ?? "",
        quiz_option_b: draft.quiz.options[1] ?? "",
        quiz_option_c: draft.quiz.options[2] ?? "",
      });
      setAiNotice(
        payload.notice ??
          "AIが下書きを作成しました。事実関係を情報源と照らし合わせて必ず確認してください。",
      );
      toast("下書きを生成しました", "success");
    } catch {
      toast("生成に失敗しました", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publish?: boolean) {
    const next = publish === undefined ? form : { ...form, is_published: publish };
    const problem = validateNewsForm(next);
    if (problem) {
      toast(problem, "error");
      return;
    }
    setSaving(true);
    try {
      const id = await saveNews(getSupabase(), next);
      setForm({ ...next, id });
      toast(publish ? "公開しました" : "保存しました", "success");
      if (!newsId) router.replace(`/admin/news/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存できませんでした";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  const quizFilled = form.quiz_question.trim().length > 0;
  const title = useMemo(() => (newsId ? "ニュースを編集" : "ニュースを作成"), [newsId]);

  return (
    <AdminShell
      title={title}
      right={
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="mr-1 flex items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-bold text-fg active:bg-white/10 disabled:opacity-50"
        >
          {saving ? <Spinner size={12} /> : <Save size={13} />}
          保存
        </button>
      }
    >
      {loading ? (
        <div className="grid min-h-[50dvh] place-items-center text-fg-faint">
          <Spinner size={22} />
        </div>
      ) : loadFailed ? (
        <div className="px-4 pt-6">
          <ErrorState message="ニュースを読み込めませんでした" />
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-8 pt-3.5">
          <section className="rounded-[20px] border border-[#a98bff]/30 bg-[linear-gradient(103deg,rgba(169,139,255,0.1),rgba(53,220,255,0.07))] px-4 py-4">
            <h2 className="flex items-center gap-1.5 text-[13.5px] font-black text-[#a98bff]">
              <Sparkles size={14} />
              AIで下書きを作る
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              元記事のテキストを貼り付けると「何が起きた？」「なんで話題？」「3秒で理解」「クイズ」の下書きを作ります。元記事にない事実は追加しません。生成後は必ず内容を確認してください。
            </p>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={5}
              placeholder="元記事の本文をここに貼り付け"
              className={`mt-2.5 ${inputClass} resize-y leading-relaxed`}
            />
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="grad-cta mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[13.5px] font-black text-[#07121a] disabled:opacity-60"
            >
              {generating ? <Spinner size={14} /> : <Wand2 size={15} />}
              {generating ? "生成中…" : "AIで下書き生成"}
            </button>
            {aiNotice && (
              <p className="mt-2.5 rounded-xl border border-[#ffc44d]/35 bg-[#ffc44d]/[0.08] px-3 py-2 text-[11px] leading-relaxed text-[#ffc44d]">
                {aiNotice}
              </p>
            )}
          </section>

          <section className="card space-y-3 px-4 py-4">
            <h2 className="text-[13.5px] font-bold text-fg">基本情報</h2>
            <Field label="タイトル" hint="1〜3行に収まる長さ。釣りタイトルにしない。">
              <textarea
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="一言説明" hint="カードに出る短い説明文">
              <textarea
                value={form.summary}
                onChange={(e) => patch({ summary: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="カテゴリ">
                <select
                  value={form.category}
                  onChange={(e) => patch({ category: e.target.value })}
                  className={inputClass}
                >
                  {NEWS_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id} className="bg-ink-800">
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="公開日時">
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => patch({ published_at: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="画像URL" hint="OGP・公式素材・ライセンス済み画像のみ">
              <input
                value={form.image_url}
                onChange={(e) => patch({ image_url: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
            <Field label="キーワード" hint="検索用。カンマ区切り">
              <input
                value={form.keywords}
                onChange={(e) => patch({ keywords: e.target.value })}
                placeholder="スマホ, 料金, 総務省"
                className={inputClass}
              />
            </Field>
            <Field label={`話題度 ${form.heat}`} hint="フィードの並び順に影響します">
              <input
                type="range"
                min={0}
                max={100}
                value={form.heat}
                onChange={(e) => patch({ heat: Number(e.target.value) })}
                className="w-full accent-[#4ef5a3]"
              />
            </Field>
          </section>

          <section className="card space-y-3 px-4 py-4">
            <h2 className="text-[13.5px] font-bold text-fg">本文（AI解説）</h2>
            <Field label="① 何が起きた？" hint="3〜6行。改行で区切ると段落になります。">
              <textarea
                value={form.what_happened}
                onChange={(e) => patch({ what_happened: e.target.value })}
                rows={6}
                className={`${inputClass} leading-relaxed`}
              />
            </Field>
            <Field label="② なんで話題？" hint="背景と社会的な意味を説明する">
              <textarea
                value={form.why_trending}
                onChange={(e) => patch({ why_trending: e.target.value })}
                rows={4}
                className={`${inputClass} leading-relaxed`}
              />
            </Field>
            <Field label="③ 3秒で理解" hint="「つまり、〜」の1文">
              <textarea
                value={form.three_second_summary}
                onChange={(e) => patch({ three_second_summary: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="⑤ みんなの反応" hint="傾向の要約のみ。個別の投稿は転載しない。">
              <textarea
                value={form.social_reaction_summary}
                onChange={(e) => patch({ social_reaction_summary: e.target.value })}
                rows={3}
                className={`${inputClass} leading-relaxed`}
              />
            </Field>
          </section>

          <section className="card space-y-3 px-4 py-4">
            <h2 className="text-[13.5px] font-bold text-fg">④ このあとどうなる？（3択）</h2>
            <Field label="質問" hint="空欄にするとクイズなしの記事になります">
              <input
                value={form.quiz_question}
                onChange={(e) => patch({ quiz_question: e.target.value })}
                placeholder="このニュースのあと、最も起きそうなのは？"
                className={inputClass}
              />
            </Field>
            {(["A", "B", "C"] as const).map((key) => {
              const field = `quiz_option_${key.toLowerCase()}` as
                | "quiz_option_a"
                | "quiz_option_b"
                | "quiz_option_c";
              return (
                <Field key={key} label={`選択肢 ${key}`}>
                  <input
                    value={form[field]}
                    onChange={(e) => patch({ [field]: e.target.value } as Partial<NewsFormValues>)}
                    className={inputClass}
                  />
                </Field>
              );
            })}

            {quizFilled && (
              <>
                <Field
                  label="結果（答え合わせ）"
                  hint="結果が確定したときだけ設定します。未確定なら「未確定」のまま。"
                >
                  <select
                    value={form.quiz_result}
                    onChange={(e) =>
                      patch({ quiz_result: e.target.value as QuizOption | "" })
                    }
                    className={inputClass}
                  >
                    <option value="" className="bg-ink-800">
                      未確定（ユーザー予想のまま）
                    </option>
                    {(["A", "B", "C"] as const).map((key) => (
                      <option key={key} value={key} className="bg-ink-800">
                        {key} が実際に起きた
                      </option>
                    ))}
                  </select>
                </Field>
                {form.quiz_result && (
                  <Field label="結果の補足">
                    <textarea
                      value={form.quiz_result_note}
                      onChange={(e) => patch({ quiz_result_note: e.target.value })}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                )}
                <p className="text-[10.5px] leading-relaxed text-fg-faint">
                  結果を設定すると、そのクイズに投票したユーザーへ「答え合わせができます」という通知が届きます。
                </p>
              </>
            )}
          </section>

          <section className="card space-y-3 px-4 py-4">
            <h2 className="text-[13.5px] font-bold text-fg">⑥ 情報源</h2>
            <Field label="情報源の名前">
              <input
                value={form.source_name}
                onChange={(e) => patch({ source_name: e.target.value })}
                placeholder="NHK / Reuters / 総務省 など"
                className={inputClass}
              />
            </Field>
            <Field label="元記事URL">
              <input
                value={form.source_url}
                onChange={(e) => patch({ source_url: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
            <Field label="情報源の種別">
              <select
                value={form.source_type}
                onChange={(e) => patch({ source_type: e.target.value })}
                className={inputClass}
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-ink-800">
                    {SOURCE_TRUST[type].mark} {SOURCE_TRUST[type].label}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="card space-y-2.5 px-4 py-4">
            <h2 className="text-[13.5px] font-bold text-fg">公開設定</h2>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-fg">速報として表示</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
                  速報タブに表示され、速報通知をオンにしているユーザーに通知が届きます。
                </p>
              </div>
              <Toggle
                checked={form.is_breaking}
                onChange={(value) => patch({ is_breaking: value })}
                accent="#ff5c7a"
                label="速報として表示"
              />
            </div>
            <div className="flex items-center gap-3 border-t border-line pt-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-fg">サンプルデータ</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
                  架空の開発用データであることを記事に明示します。
                </p>
              </div>
              <Toggle
                checked={form.is_sample}
                onChange={(value) => patch({ is_sample: value })}
                accent="#ffc44d"
                label="サンプルデータ"
              />
            </div>
            <div className="flex items-center gap-3 border-t border-line pt-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-fg">公開中</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">
                  オフのあいだは下書きとして管理画面にだけ表示されます。
                </p>
              </div>
              <Toggle
                checked={form.is_published}
                onChange={(value) => patch({ is_published: value })}
                accent="#4ef5a3"
                label="公開中"
              />
            </div>
          </section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave(false)}
              disabled={saving}
              className="flex-1 rounded-2xl border border-line-strong py-3 text-[13.5px] font-bold text-fg active:bg-white/10 disabled:opacity-50"
            >
              下書き保存
            </button>
            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving}
              className="grad-cta flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-[13.5px] font-black text-[#07121a] disabled:opacity-60"
            >
              {saving ? <Spinner size={14} /> : null}
              公開する
            </button>
          </div>

          {form.id && (
            <Link
              href={`/news/${form.id}`}
              className="flex items-center justify-center gap-1.5 py-1 text-[12.5px] font-bold text-fg-muted"
            >
              アプリでの表示を確認
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  );
}
