"use client";

import { SUBJECTS, SUBJECT_LABEL } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import {
  adminDeleteSprint,
  adminListSprints,
  adminSaveSprint,
  type AdminSprintRow,
} from "@/lib/sprint-client";
import { jstYmd, sprintOpensAt } from "@/lib/sprint-schedule";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function AdminSprintPage() {
  const { isAdmin, ready } = useApp();
  const [items, setItems] = useState<AdminSprintRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sprintDay, setSprintDay] = useState(jstYmd());
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hint, setHint] = useState("");
  const [subject, setSubject] = useState<"math" | "physics" | "chemistry">("math");
  const [topic, setTopic] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminListSprints();
    if (res.error) {
      setError(res.error);
      return;
    }
    const rows = (res.data?.items as AdminSprintRow[] | undefined) ?? [];
    setItems(rows);
    setError("");
  }, []);

  useEffect(() => {
    if (ready && isAdmin) void load();
  }, [ready, isAdmin, load]);

  if (!ready) return <p className="p-6 text-sm text-muted">読み込み中…</p>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">管理者のみ利用できます。</p>
        <Link href="/settings" className="mt-3 inline-block text-sm text-aha">
          設定へ戻る
        </Link>
      </div>
    );
  }

  const resetForm = () => {
    setEditingId(null);
    setSprintDay(jstYmd());
    setTitle("");
    setText("");
    setCorrectAnswer("");
    setExplanation("");
    setHint("");
    setSubject("math");
    setTopic("");
    setDifficultyLevel(3);
  };

  const fill = (row: AdminSprintRow) => {
    setEditingId(row.id);
    setSprintDay(row.sprintDay);
    setTitle(row.title);
    setText(row.text);
    setCorrectAnswer(row.correctAnswer);
    setExplanation(row.explanation);
    setHint(row.hint);
    setSubject(row.subject === "physics" || row.subject === "chemistry" ? row.subject : "math");
    setTopic(row.topic);
    setDifficultyLevel(row.difficultyLevel);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    const res = await adminSaveSprint(
      {
        sprintDay,
        title,
        text,
        correctAnswer,
        explanation,
        hint,
        subject,
        topic,
        difficultyLevel,
      },
      editingId ?? undefined,
    );
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    resetForm();
    await load();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const res = await adminDeleteSprint(id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (editingId === id) resetForm();
    await load();
  };

  return (
    <div className="px-4 py-5 pb-24">
      <h1 className="text-lg font-black">21時問題管理</h1>
      <p className="mt-1 text-[11px] text-muted">公開は毎日 21:00（Asia/Tokyo）。Cron は使いません。</p>

      <div className="mt-4 space-y-3 rounded-2xl border border-gray-800 bg-panel p-4">
        <label className="block text-xs font-bold text-muted">
          公開日（JST）
          <input
            type="date"
            value={sprintDay}
            onChange={(e) => setSprintDay(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          タイトル
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          問題文
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          正解
          <input
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          解説
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold text-muted">
          ヒント
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold text-muted">
            教科
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as typeof subject)}
              className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
            >
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-muted">
            難易度
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} {d.hint}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold text-muted">
          分野
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例: 整数 / 力学 / 有機"
            className="mt-1 w-full rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {editingId ? "予約を更新" : "21時問題として予約"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="w-full text-xs text-muted">
            新規予約に戻る
          </button>
        )}
      </div>

      <h2 className="mt-6 text-sm font-black">予約済み一覧</h2>
      <ul className="mt-2 space-y-2">
        {items.map((row) => {
          const open = sprintOpensAt(row.sprintDay);
          const published = Date.now() >= open.getTime();
          const md = `${row.sprintDay.slice(5, 7)}/${row.sprintDay.slice(8, 10)}`;
          return (
            <li key={row.id} className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
              <p className="text-sm font-bold">
                {md} 21:00　{row.title || row.text.slice(0, 24) || "（無題）"}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {SUBJECT_LABEL[row.subject as keyof typeof SUBJECT_LABEL] ?? row.subject}
                {row.topic ? ` · ${row.topic}` : ""} · {published ? "公開済" : "予約"}
              </p>
              {!published && (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="text-xs text-aha" onClick={() => fill(row)}>
                    編集
                  </button>
                  <button type="button" className="text-xs text-red-400" onClick={() => void remove(row.id)}>
                    削除
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {!items.length && <li className="text-sm text-muted">まだ予約がありません。</li>}
      </ul>
    </div>
  );
}
