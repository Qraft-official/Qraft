"use client";

import { SUBJECTS } from "@/lib/constants";
import { generateAiProblem } from "@/lib/premium";
import { toMathliveLatex, wrapMathliveLatex } from "@/lib/mathlive";
import { useApp } from "@/lib/store";
import type { CanvasPage, Subject } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, PenLine, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageUploadSection } from "./ImageUploadSection";
import { MathLiveEditor } from "./MathLiveEditor";
import { MultiPageCanvas } from "./MultiPageCanvas";
import { QuoteEmbed } from "./QuoteEmbed";
import { VisualMathEditor } from "./VisualMathEditor";

export function CreateSheet() {
  const { composer, closeComposer, addProblem, addSolution, getPost, hasPremium, openPaywall, isDeveloper } =
    useApp();
  const open = composer.open && composer.mode !== "reply";
  const quotePostId = composer.open && composer.mode === "solution" ? composer.quotePostId : undefined;
  const quoted = quotePostId ? getPost(quotePostId) : undefined;

  const [picked, setPicked] = useState<"problem" | "solution" | null>(null);
  const [subject, setSubject] = useState<Subject>("math");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [solutionDraft, setSolutionDraft] = useState("");
  const [isSprint, setIsSprint] = useState(false);
  const [postError, setPostError] = useState("");
  const [posting, setPosting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [pages, setPages] = useState<CanvasPage[]>([{ id: "page-1", strokes: [] }]);
  const [inputMode, setInputMode] = useState<"hand" | "typed">("hand");
  const [typedBody, setTypedBody] = useState("");

  const mode: "pick" | "problem" | "solution" | null =
    !open
      ? null
      : composer.mode === "solution"
        ? "solution"
        : composer.mode === "problem" && isDeveloper
          ? "problem"
          : (picked === "problem" && !isDeveloper ? "pick" : (picked ?? "pick"));

  useEffect(() => {
    if (!composer.open) {
      setPicked(null);
      return;
    }
    if (composer.mode === "menu") {
      setText("");
      setTitle("");
      setSolutionDraft("");
      setIsSprint(false);
      setPostError("");
      setPosting(false);
      setPhoto(undefined);
      setAiPrompt("");
      setPages([{ id: "page-1", strokes: [] }]);
      setSubject("math");
      setInputMode("hand");
      setTypedBody("");
    }
    if (composer.mode === "solution") {
      setText("");
      setPhoto(undefined);
      setPages([{ id: "page-1", strokes: [] }]);
      setTypedBody("");
      setInputMode("hand");
      const q = composer.quotePostId ? getPost(composer.quotePostId) : undefined;
      if (q) setSubject(q.subject);
    }
  }, [composer, getPost]);

  const attachPhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(file);
  };

  const photoRow = (
    <ImageUploadSection
      isPremium={hasPremium}
      onFile={attachPhoto}
      preview={photo}
      onClear={() => setPhoto(undefined)}
    />
  );

  const close = () => closeComposer();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className={`flex w-full max-w-lg flex-col overflow-hidden border border-gray-800 bg-black ${
              mode === "solution" || mode === "problem"
                ? "h-[92dvh] max-h-[92dvh] rounded-t-3xl sm:rounded-3xl"
                : "rounded-t-3xl p-4 sm:rounded-3xl"
            }`}
          >
            {mode === "pick" && (
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold">新規投稿</p>
                  <button onClick={close} className="rounded-full p-1 text-muted">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid gap-3 pb-6">
                  {isDeveloper ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPicked("problem")}
                      className="rounded-2xl border border-gray-800 bg-panel px-4 py-4 text-left"
                    >
                      <p className="text-base font-bold">❓ 問題を投稿</p>
                      <p className="mt-1 text-sm text-muted">
                        管理者専用。21:00全国戦フラグもここから。
                      </p>
                    </motion.button>
                  ) : (
                    <div className="rounded-2xl border border-gray-800 bg-panel/60 px-4 py-4">
                      <p className="text-base font-bold text-muted">❓ 問題を投稿</p>
                      <p className="mt-1 text-sm text-muted">
                        問題・21:00全国戦の出題は管理者のみです。解法の投稿と挑戦はできます。
                      </p>
                    </div>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPicked("solution")}
                    className="rounded-2xl border border-aha/30 bg-aha/5 px-4 py-4 text-left"
                  >
                    <p className="text-base font-bold">✍️ 解法を投稿</p>
                    <p className="mt-1 text-sm text-muted">
                      問題カードから投稿すると引用リポストになります。
                    </p>
                  </motion.button>
                </div>
              </div>
            )}

            {mode === "problem" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between px-4 py-3">
                  <p className="text-sm font-bold">問題を投稿</p>
                  <button onClick={close} className="rounded-full p-1 text-muted">
                    <X size={18} />
                  </button>
                </div>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="mx-4 mb-2 w-[calc(100%-2rem)] shrink-0 rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.label}
                    </option>
                  ))}
                </select>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タイトル（任意）"
                  className="mx-4 mb-2 w-[calc(100%-2rem)] shrink-0 rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3">
                  <MathLiveEditor
                    value={text}
                    onChange={setText}
                    footer={
                      <div className="min-w-0 space-y-2">
                        <textarea
                          value={solutionDraft}
                          onChange={(e) => setSolutionDraft(e.target.value)}
                          placeholder="解答（任意）"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-gray-800 bg-panel px-3 py-2 text-xs outline-none"
                        />
                        <label className="flex items-center gap-2 text-xs text-orange-300">
                          <input
                            type="checkbox"
                            checked={isSprint}
                            onChange={(e) => setIsSprint(e.target.checked)}
                            className="accent-orange-400"
                          />
                          21:00全国戦に載せる
                        </label>
                        <div className="rounded-2xl border border-gray-800 bg-panel p-2">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold">
                            <Sparkles size={12} className="text-aha" /> AI問題メーカー
                          </p>
                          <div className="flex min-w-0 gap-2">
                            <input
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              placeholder="例: コーシー・シュワルツ"
                              className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black px-2 py-1.5 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasPremium) {
                                  openPaywall("AI問題メーカーは Qraft Premium（月額¥300）限定です。");
                                  return;
                                }
                                const g = generateAiProblem(subject, aiPrompt);
                                setSubject(g.subject);
                                setText(toMathliveLatex(g.text));
                              }}
                              className="shrink-0 rounded-full bg-neon/20 px-3 py-1.5 text-[11px] font-bold text-purple-200"
                            >
                              生成
                            </button>
                          </div>
                        </div>
                        {photoRow}
                      </div>
                    }
                  />
                </div>
                <div className="shrink-0 px-4 py-3">
                  {postError && <p className="mb-2 text-xs text-red-400">{postError}</p>}
                  <button
                    disabled={!text.trim() || posting}
                    onClick={() => {
                      void (async () => {
                        setPosting(true);
                        setPostError("");
                        const res = await addProblem({
                          subject,
                          text: wrapMathliveLatex(text),
                          title,
                          solution: solutionDraft,
                          photo,
                          isSprint,
                        });
                        setPosting(false);
                        if (res.error) {
                          setPostError(res.error);
                          return;
                        }
                        close();
                      })();
                    }}
                    className="w-full rounded-full bg-neon py-3 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {posting ? "投稿中…" : "投稿する"}
                  </button>
                </div>
              </div>
            )}

            {mode === "solution" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-800 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {inputMode === "hand" ? (
                      <PenLine size={16} className="shrink-0 text-aha" />
                    ) : (
                      <Keyboard size={16} className="shrink-0 text-aha" />
                    )}
                    <p className="truncate text-sm font-bold">
                      {quoted ? "引用して解法を投稿" : "解法を投稿"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value as Subject)}
                      className="max-w-[5.5rem] rounded-lg border border-gray-800 bg-panel px-1.5 py-1 text-xs"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button onClick={close} className="text-muted">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 border-b border-gray-800 p-2">
                  <button
                    type="button"
                    onClick={() => setInputMode("hand")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-bold ${
                      inputMode === "hand" ? "bg-aha text-black" : "bg-white/5 text-muted"
                    }`}
                  >
                    <PenLine size={14} /> 手書きノート
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("typed")}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-bold ${
                      inputMode === "typed" ? "bg-aha text-black" : "bg-white/5 text-muted"
                    }`}
                  >
                    <Keyboard size={14} /> 打ち込み式
                  </button>
                </div>
                {inputMode === "hand" ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                    {quotePostId && (
                      <div className="shrink-0 border-b border-gray-800 bg-panel/40 px-3 pb-3">
                        <p className="pt-2 text-[10px] font-bold tracking-wide text-muted">
                          引用する問題 · スクロールでいつでも確認できます
                        </p>
                        <QuoteEmbed postId={quotePostId} />
                      </div>
                    )}
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="一言コメント（任意）"
                      className="shrink-0 border-b border-gray-800 bg-transparent px-4 py-2 text-sm outline-none"
                    />
                    <div className="h-[min(52dvh,26rem)] min-h-[18rem] shrink-0">
                      <MultiPageCanvas pages={pages} onChange={setPages} premium={hasPremium} />
                    </div>
                    <div className="shrink-0 px-4 py-2">{photoRow}</div>
                  </div>
                ) : (
                  <VisualMathEditor
                    value={typedBody}
                    onChange={setTypedBody}
                    header={
                      quotePostId ? (
                        <div className="mb-2 shrink-0 rounded-2xl border border-gray-800 bg-panel/40 px-1 pb-1">
                          <p className="px-2 pt-2 text-[10px] font-bold tracking-wide text-muted">
                            引用する問題 · 上にスクロールして確認
                          </p>
                          <QuoteEmbed postId={quotePostId} />
                        </div>
                      ) : null
                    }
                    footer={<div className="min-w-0">{photoRow}</div>}
                  />
                )}
                <div className="shrink-0 px-4 py-3">
                  <button
                    disabled={inputMode === "typed" && !typedBody.trim()}
                    onClick={() => {
                      if (inputMode === "typed") {
                        addSolution({
                          subject,
                          text: wrapMathliveLatex(typedBody),
                          problemId: quotePostId,
                          solutionFormat: "typed",
                          photo,
                        });
                      } else {
                        addSolution({
                          subject,
                          text: text.trim() || (quoted ? "引用解法を投稿した。" : "手書き解法を投稿した。"),
                          pages: pages.map((p, i) => ({
                            id: p.id,
                            latex: `\\text{Page ${i + 1}}`,
                            doodle: i,
                          })),
                          problemId: quotePostId,
                          solutionFormat: "handwriting",
                          photo,
                        });
                      }
                      close();
                    }}
                    className="w-full rounded-full bg-aha py-3 text-sm font-bold text-black disabled:opacity-40"
                  >
                    {quoted ? "引用して公開" : "解法を公開"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
