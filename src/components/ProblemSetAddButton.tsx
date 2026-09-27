"use client";

import {
  addProblemToSet,
  createProblemSet,
  fetchMyProblemSets,
  type ProblemSetSummary,
} from "@/lib/problem-sets";
import { useApp } from "@/lib/store";
import { BookPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProblemSetAddButton({ problemId }: { problemId: string }) {
  const { authenticated } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<ProblemSetSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const show = async () => {
    if (!authenticated) {
      router.push(`/login?next=${encodeURIComponent(`/p/${problemId}`)}`);
      return;
    }
    setOpen(true);
    setMessage("");
    setSets(await fetchMyProblemSets());
  };

  const add = async (set: ProblemSetSummary) => {
    setBusy(true);
    const result = await addProblemToSet(set.id, problemId);
    if (result.error) setMessage(result.error);
    else {
      setMessage(result.added ? `「${set.title}」に追加しました` : `「${set.title}」には追加済みです`);
      if (result.added) setSets((current) => current.map((item) => item.id === set.id ? { ...item, itemCount: item.itemCount + 1 } : item));
    }
    setBusy(false);
  };

  const createAndAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const created = await createProblemSet(title, description);
    if (created.error || !created.set) {
      setMessage(created.error ?? "作成できませんでした");
      setBusy(false);
      return;
    }
    const added = await addProblemToSet(created.set.id, problemId);
    if (added.error) {
      setMessage(added.error);
      setSets((current) => [created.set!, ...current]);
    } else {
      setMessage(`「${created.set.title}」を作成して問題を追加しました`);
      setSets((current) => [{ ...created.set!, itemCount: 1 }, ...current]);
      setTitle("");
      setDescription("");
    }
    setBusy(false);
  };

  return (
    <>
      <button type="button" onClick={() => void show()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-700 px-4 text-sm font-bold text-white">
        <BookPlus size={16} /> 問題集に追加
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-2 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="problem-set-picker-title" onClick={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-700 bg-[#101820] p-4 shadow-2xl">
            <header className="flex items-center justify-between gap-3">
              <h2 id="problem-set-picker-title" className="text-base font-black">問題集に追加</h2>
              <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-muted" aria-label="閉じる"><X size={20} /></button>
            </header>
            <div className="mt-2 space-y-1">
              {sets.map((set) => (
                <button key={set.id} type="button" disabled={busy} onClick={() => void add(set)} className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-gray-800 px-1 text-left disabled:opacity-40">
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{set.title}</span><span className="text-xs text-muted">{set.itemCount}問</span></span>
                  <span className="shrink-0 text-xs font-bold text-aha">追加</span>
                </button>
              ))}
              {!sets.length ? <p className="py-2 text-sm text-muted">問題集はまだありません。</p> : null}
            </div>
            <form onSubmit={(event) => void createAndAdd(event)} className="mt-4 space-y-2 border-t border-gray-800 pt-4">
              <h3 className="text-sm font-black">新しい問題集</h3>
              <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 100))} maxLength={100} required placeholder="タイトル" className="min-h-11 w-full rounded-lg border border-gray-700 bg-black px-3 text-sm outline-none focus:border-aha" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} placeholder="説明（任意）" className="w-full resize-y rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm outline-none focus:border-aha" />
              <button type="submit" disabled={busy || !title.trim()} className="min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40">{busy ? "保存中…" : "作成して追加"}</button>
            </form>
            {message ? <p role="status" className="mt-3 text-sm text-aha">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
