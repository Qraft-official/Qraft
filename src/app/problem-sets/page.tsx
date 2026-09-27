"use client";

import {
  createProblemSet,
  fetchMyProblemSets,
  type ProblemSetSummary,
} from "@/lib/problem-sets";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProblemSetsPage() {
  const [sets, setSets] = useState<ProblemSetSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchMyProblemSets().then((result) => {
      if (cancelled) return;
      setSets(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await createProblemSet(title, description);
    if (result.error || !result.set) {
      setError(result.error ?? "作成できませんでした");
    } else {
      setSets((current) => [result.set!, ...current]);
      setTitle("");
      setDescription("");
    }
    setBusy(false);
  };

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-black/90 px-4 py-4 backdrop-blur">
        <h1 className="flex items-center gap-2 text-lg font-black"><BookOpen size={19} className="text-aha" />問題集</h1>
      </header>
      <form onSubmit={(event) => void create(event)} className="space-y-2 border-b border-gray-800 px-4 py-4">
        <h2 className="text-sm font-black">新しい問題集</h2>
        <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 100))} maxLength={100} required placeholder="タイトル" className="min-h-11 w-full rounded-lg border border-gray-800 bg-panel px-3 text-sm outline-none focus:border-aha" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} placeholder="説明（任意）" className="w-full resize-y rounded-lg border border-gray-800 bg-panel px-3 py-2 text-sm outline-none focus:border-aha" />
        <button type="submit" disabled={busy || !title.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-aha px-4 text-sm font-black text-black disabled:opacity-40">
          <Plus size={16} />{busy ? "作成中…" : "問題集を作成"}
        </button>
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      </form>
      {loading ? <p className="px-4 py-8 text-sm text-muted">読み込み中…</p> : sets.length ? (
        <ul>
          {sets.map((set) => (
            <li key={set.id} className="border-b border-gray-800">
              <Link href={`/problem-sets/${set.id}`} className="block min-h-20 px-4 py-4 hover:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-black text-white">{set.title}</span>
                    {set.description ? <span className="mt-1 block whitespace-pre-wrap text-xs text-muted">{set.description}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-aha">{set.itemCount}問</span>
                </div>
                <time className="mt-2 block text-[11px] text-muted" dateTime={set.updatedAt}>更新 {new Date(set.updatedAt).toLocaleDateString("ja-JP")}</time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-8 text-sm text-muted">問題集はまだありません。問題カードの「問題集に追加」から作成できます。</p>
      )}
    </main>
  );
}
