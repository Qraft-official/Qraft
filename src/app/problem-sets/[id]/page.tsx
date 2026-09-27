"use client";

import { PublicProblemCard } from "@/components/PublicProblemCard";
import {
  deleteProblemSet,
  fetchProblemSet,
  reorderProblemSet,
  removeProblemFromSet,
  updateProblemSet,
  type ProblemSetEntry,
  type ProblemSetSummary,
} from "@/lib/problem-sets";
import { ArrowLeft, ArrowDown, ArrowUp, BookOpen, Check, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ProblemSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [set, setSet] = useState<ProblemSetSummary | null>(null);
  const [items, setItems] = useState<ProblemSetEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const result = await fetchProblemSet(id);
    if (!result) {
      setSet(null);
      setItems([]);
    } else {
      setSet(result.set);
      setItems(result.items);
      setTitle(result.set.title);
      setDescription(result.set.description ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // `id` is stable for this route instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ordered = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const active = ordered[step];

  const saveDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await updateProblemSet(id, title, description);
    if (result.error) setError(result.error);
    else setSet((current) => current ? { ...current, title: title.trim(), description: description.trim() || null, updatedAt: new Date().toISOString() } : current);
    setBusy(false);
  };

  const removeItem = async (problemId: string) => {
    const result = await removeProblemFromSet(id, problemId);
    if (result.error) setError(result.error);
    else {
      setItems((current) => current.filter((item) => item.problemId !== problemId));
      setCompleted((current) => {
        const next = new Set(current);
        next.delete(problemId);
        return next;
      });
      setStep((current) => Math.min(current, Math.max(ordered.length - 2, 0)));
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const result = await reorderProblemSet(id, next.map((item) => item.problemId));
    if (result.error) setError(result.error);
    else setItems(next.map((item, position) => ({ ...item, position })));
  };

  const finishStep = () => {
    if (!active) return;
    setCompleted((current) => new Set(current).add(active.problemId));
    setStep((current) => Math.min(current + 1, ordered.length));
  };

  const deleteSet = async () => {
    if (!window.confirm("この問題集を削除しますか？問題自体は削除されません。")) return;
    const result = await deleteProblemSet(id);
    if (result.error) setError(result.error);
    else router.replace("/problem-sets");
  };

  if (loading) return <p className="px-4 py-8 text-sm text-muted">読み込み中…</p>;
  if (!set) return <p className="px-4 py-8 text-sm text-muted">問題集が見つからないか、閲覧権限がありません。</p>;

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/90 px-3 py-3 backdrop-blur">
        <Link href="/problem-sets" aria-label="問題集一覧へ戻る" className="flex h-11 w-11 items-center justify-center text-muted"><ArrowLeft size={20} /></Link>
        <div className="min-w-0"><h1 className="truncate text-base font-black">{set.title}</h1><p className="text-xs text-muted">{ordered.length}問 · 更新 {new Date(set.updatedAt).toLocaleDateString("ja-JP")}</p></div>
      </header>

      <form onSubmit={(event) => void saveDetails(event)} className="space-y-2 border-b border-gray-800 px-4 py-4">
        <label className="block text-xs font-bold text-muted">タイトル<input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 100))} maxLength={100} className="mt-1 min-h-11 w-full rounded-lg border border-gray-800 bg-panel px-3 text-sm text-white outline-none focus:border-aha" /></label>
        <label className="block text-xs font-bold text-muted">説明（任意）<textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 1000))} maxLength={1000} rows={2} className="mt-1 w-full resize-y rounded-lg border border-gray-800 bg-panel px-3 py-2 text-sm text-white outline-none focus:border-aha" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !title.trim()} className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold disabled:opacity-40">{busy ? "保存中…" : "変更を保存"}</button>
          <button type="button" onClick={() => void deleteSet()} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-rose-300"><Trash2 size={15} />問題集を削除</button>
        </div>
      </form>

      <section className="border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-black"><BookOpen size={16} className="text-aha" />問題一覧</h2>
          <Link href="/discover" className="min-h-11 inline-flex items-center text-xs font-bold text-sky-400">Discoverから追加</Link>
        </div>
        {!ordered.length ? <p className="py-5 text-sm text-muted">問題がありません。Discoverの問題カードから追加できます。</p> : (
          <ol className="divide-y divide-gray-800">
            {ordered.map((item, index) => (
              <li key={item.problemId} className="flex items-center gap-2 py-2">
                <span className="w-7 shrink-0 text-xs font-bold text-muted">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.preview?.title || item.preview?.body.slice(0, 70) || "公開終了した問題"}</span>
                <button type="button" disabled={index === 0} onClick={() => void moveItem(index, -1)} aria-label="上へ" className="flex h-10 w-10 items-center justify-center text-muted disabled:opacity-30"><ArrowUp size={17} /></button>
                <button type="button" disabled={index === ordered.length - 1} onClick={() => void moveItem(index, 1)} aria-label="下へ" className="flex h-10 w-10 items-center justify-center text-muted disabled:opacity-30"><ArrowDown size={17} /></button>
                <button type="button" onClick={() => void removeItem(item.problemId)} aria-label="問題集から削除" className="flex h-10 w-10 items-center justify-center text-rose-300"><Trash2 size={16} /></button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black">この問題集を解く</h2>
          <p className="text-sm font-black text-aha">{completed.size} / {ordered.length} 完了</p>
        </div>
        {!running ? (
          <button type="button" disabled={!ordered.length} onClick={() => { setStep(0); setRunning(true); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-aha px-4 text-sm font-black text-black disabled:opacity-40"><Play size={16} />この問題集を解く</button>
        ) : active ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-800">
            <p className="border-b border-gray-800 px-3 py-2 text-xs font-bold text-muted">{step + 1} / {ordered.length}</p>
            {active.preview ? <PublicProblemCard preview={active.preview} compact /> : <p className="p-3 text-sm text-muted">この問題は現在公開されていません。</p>}
            <div className="flex flex-wrap gap-2 p-3">
              {active.preview ? <Link href={`/p/${active.problemId}?set=${id}&step=${step}`} className="inline-flex min-h-11 items-center rounded-full border border-gray-700 px-4 text-sm font-bold">問題を解く</Link> : null}
              <button type="button" onClick={finishStep} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-aha px-4 text-sm font-black text-black"><Check size={16} />解いたので次へ</button>
              <button type="button" onClick={() => setRunning(false)} className="min-h-11 rounded-full px-3 text-sm font-bold text-muted">中断</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
            <p className="text-sm font-black text-emerald-300">問題集を完了しました</p>
            <button type="button" onClick={() => { setStep(0); setRunning(true); }} className="mt-2 min-h-11 text-sm font-bold text-aha">もう一度解く</button>
          </div>
        )}
      </section>
      {error ? <p role="alert" className="px-4 py-2 text-sm text-red-400">{error}</p> : null}
    </main>
  );
}
