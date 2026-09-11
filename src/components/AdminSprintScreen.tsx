"use client";

import { PostCard } from "@/components/PostCard";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { addJstDays, jstDateString, shortMd } from "@/lib/jst";
import { referralFetch } from "@/lib/referral-client";
import { useApp } from "@/lib/store";
import type { Post, Subject } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SprintItem = {
  id: string;
  title: string;
  text: string;
  subject: Subject;
  topic: string;
  difficultyLevel: number;
  sprintDay: string | null;
  publishAt: string | null;
  status: string;
  editable: boolean;
  correctAnswer: string;
  hint: string;
  explanation: string;
};

const emptyForm = () => ({
  sprintDay: addJstDays(jstDateString(), 1),
  title: "",
  text: "",
  subject: "math" as Subject,
  topic: "",
  difficultyLevel: 3,
  correctAnswer: "",
  hint: "",
  explanation: "",
});

export function AdminSprintScreen() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<SprintItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const res = await referralFetch("/api/admin/sprint");
    if (res.error) {
      if (/管理者のみ|ログイン/.test(res.error)) setForbidden(true);
      setError(res.error);
      return;
    }
    setForbidden(false);
    const data = res.data as { items?: SprintItem[] };
    setItems(Array.isArray(data.items) ? data.items : []);
    setError("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fill = (item: SprintItem) => {
    setEditingId(item.id);
    setForm({
      sprintDay: item.sprintDay ?? addJstDays(jstDateString(), 1),
      title: item.title,
      text: item.text,
      subject: item.subject,
      topic: item.topic,
      difficultyLevel: item.difficultyLevel,
      correctAnswer: item.correctAnswer,
      hint: item.hint,
      explanation: item.explanation,
    });
    setPreviewPost(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPreviewPost(null);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      id: editingId ?? undefined,
    };
    const res = await referralFetch("/api/admin/sprint", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    resetForm();
    await load();
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const res = await referralFetch(`/api/admin/sprint?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (editingId === id) resetForm();
    await load();
  };

  const preview = async (id: string) => {
    setError("");
    const res = await referralFetch(`/api/admin/sprint?preview=${encodeURIComponent(id)}`);
    if (res.error) {
      setError(res.error);
      return;
    }
    const data = res.data as { post?: Post };
    if (data.post) setPreviewPost(data.post);
  };

  const allowed = isAdmin;
  const heading = useMemo(
    () => (editingId ? "21時問題を編集" : "21時問題を予約"),
    [editingId],
  );

  if (forbidden) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-bold">この画面は管理者専用です。</p>
        <Link href="/profile" className="mt-4 inline-block text-sm text-aha">
          プロフィールへ戻る
        </Link>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-bold">この画面は管理者専用です。</p>
        <Link href="/profile" className="mt-4 inline-block text-sm text-aha">
          プロフィールへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-black/85 px-3 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/settings?tab=about" className="rounded-full px-2 py-1 text-sm text-muted hover:text-white">
            ← 設定
          </Link>
          <h1 className="text-lg font-black">21時問題管理</h1>
        </div>
        <p className="mt-1 text-[11px] text-muted">公開時刻は選択した日の 21:00（日本時間）に自動設定されます。</p>
      </header>

      <div className="space-y-3 px-4 py-4">
        <p className="text-sm font-black">{heading}</p>
        <label className="block text-xs font-bold text-muted">
          公開日
          <input
            type="date"
            value={form.sprintDay}
            onChange={(e) => setForm((f) => ({ ...f, sprintDay: e.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-800 bg-panel px-3 text-sm text-white"
          />
        </label>
        <p className="text-[11px] text-aha">
          → {form.sprintDay.replace(/-/g, "/")} 21:00 JST に公開
        </p>
        <label className="block text-xs font-bold text-muted">
          問題タイトル
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-800 bg-panel px-3 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          問題文
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            rows={8}
            className="mt-1 w-full resize-y rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm text-white"
          />
        </label>
        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">教科</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, subject: s.id }))}
                className={`min-h-11 rounded-xl border text-sm font-bold ${
                  form.subject === s.id ? "border-aha bg-aha/15 text-aha" : "border-gray-800"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-bold text-muted">
          分野
          <input
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="例: 整数・規則性"
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-800 bg-panel px-3 text-sm text-white"
          />
        </label>
        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">難易度</p>
          <div className="grid grid-cols-5 gap-1">
            {DIFFICULTY_LEVELS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, difficultyLevel: d.id }))}
                className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-xs font-bold ${
                  form.difficultyLevel === d.id ? "bg-aha text-black" : "border border-gray-700 text-muted"
                }`}
              >
                <span>{d.label}</span>
                <span className="text-[10px] opacity-80">{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-bold text-muted">
          正解
          <input
            value={form.correctAnswer}
            onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-800 bg-panel px-3 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          ヒント
          <textarea
            value={form.hint}
            onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))}
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          解説
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            rows={6}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm text-white"
          />
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40"
        >
          {busy ? "保存中…" : editingId ? "予約を更新" : "21時問題として予約"}
        </button>
        {editingId ? (
          <button type="button" onClick={resetForm} className="min-h-11 w-full rounded-full border border-gray-700 text-sm font-bold">
            新規予約に戻る
          </button>
        ) : null}
      </div>

      {previewPost ? (
        <div className="border-y border-aha/30 bg-aha/5 px-2 py-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-black text-aha">プレビュー（一般ユーザーには非公開）</p>
            <button type="button" className="text-xs text-muted" onClick={() => setPreviewPost(null)}>
              閉じる
            </button>
          </div>
          <PostCard post={previewPost} />
        </div>
      ) : null}

      <div className="px-4 py-4">
        <p className="mb-2 text-sm font-black">予約一覧</p>
        {items.length === 0 ? (
          <p className="text-xs text-muted">まだ予約はありません。</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-gray-800 bg-panel/50 px-3 py-3">
                <p className="text-sm font-bold">
                  {item.sprintDay ? `${shortMd(item.sprintDay)}　21:00　` : ""}
                  {item.title || "（無題）"}
                  <span className="ml-2 text-[11px] font-semibold text-aha">{item.status}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted">{item.topic || SUBJECTS.find((s) => s.id === item.subject)?.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void preview(item.id)}
                    className="min-h-11 rounded-full border border-aha/40 px-3 text-xs font-bold text-aha"
                  >
                    プレビュー
                  </button>
                  {item.editable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fill(item)}
                        className="min-h-11 rounded-full border border-gray-700 px-3 text-xs font-bold"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(item.id)}
                        className="min-h-11 rounded-full border border-red-500/40 px-3 text-xs font-bold text-red-300"
                      >
                        削除
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
