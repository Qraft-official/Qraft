"use client";

import { SUBJECTS } from "@/lib/constants";
import { emptyCanvasPage } from "@/lib/draw-canvas";
import { generateAiProblem } from "@/lib/premium";
import { toMathliveLatex, wrapMathliveLatex } from "@/lib/mathlive";
import { useApp } from "@/lib/store";
import type { CanvasPage, ProblemMode, Subject } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, PenLine, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageUploadSection } from "./ImageUploadSection";
import { MultiPageCanvas, type MultiPageCanvasHandle } from "./MultiPageCanvas";
import { QuoteEmbed } from "./QuoteEmbed";
import { TypedNotebook, type TypedPage } from "./TypedNotebook";

export function CreateSheet() {
  const { composer, closeComposer, addProblem, addSolution, getPost, hasPremium, openPaywall } =
    useApp();
  const quotePostId = composer.open && composer.mode === "solution" ? composer.quotePostId : undefined;
  const openProblem = composer.open && composer.mode === "problem";
  const isSprintProblem = openProblem && !!composer.isSprint;
  const openSolution = composer.open && composer.mode === "solution" && !!quotePostId;
  const open = openProblem || openSolution;

  const [subject, setSubject] = useState<Subject>("math");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [solutionDraft, setSolutionDraft] = useState("");
  const [postError, setPostError] = useState("");
  const [posting, setPosting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [pages, setPages] = useState<CanvasPage[]>([emptyCanvasPage("page-1")]);
  const [inputMode, setInputMode] = useState<"hand" | "typed">("hand");
  const [typedPages, setTypedPages] = useState<TypedPage[]>([{ id: "t-1", latex: "" }]);
  const [typedIndex, setTypedIndex] = useState(0);
  const [postMode, setPostMode] = useState<ProblemMode>("question");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [solverAnswer, setSolverAnswer] = useState("");
  const [pulseToast, setPulseToast] = useState("");
  const canvasRef = useRef<MultiPageCanvasHandle>(null);
  const quotePost = quotePostId ? getPost(quotePostId) : undefined;
  const quotingChallenge = openSolution && quotePost?.problemMode === "challenge";

  useEffect(() => {
    if (!composer.open) return;
    if (composer.mode === "problem") {
      setText("");
      setTitle("");
      setSolutionDraft("");
      setPostError("");
      setPosting(false);
      setPhoto(undefined);
      setAiPrompt("");
      setPages([emptyCanvasPage("page-1")]);
      setSubject("math");
      setInputMode("typed");
      setTypedPages([{ id: "t-1", latex: "" }]);
      setTypedIndex(0);
      setPostMode("question");
      setCorrectAnswer("");
    }
    if (composer.mode === "solution") {
      setText("");
      setPhoto(undefined);
      setPages([emptyCanvasPage("page-1")]);
      setTypedPages([{ id: "t-1", latex: "" }]);
      setTypedIndex(0);
      setInputMode("hand");
      setPostError("");
      setPosting(false);
      setSolverAnswer("");
      const q = getPost(composer.quotePostId);
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

  const modeTabs = (
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
  );

  const extras = (
    <div className="min-w-0 space-y-2">
      <textarea
        value={solutionDraft}
        onChange={(e) => setSolutionDraft(e.target.value)}
        placeholder="解答メモ（任意・非公開でも可）"
        rows={2}
        className="w-full resize-none rounded-xl border border-gray-800 bg-panel px-3 py-2 text-xs outline-none"
      />
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
                openPaywall("AI問題メーカーは Qraft Premium（月額¥400）限定です。");
                return;
              }
              const g = generateAiProblem(subject, aiPrompt);
              setSubject(g.subject);
              setInputMode("typed");
              const latex = toMathliveLatex(g.text);
              setTypedPages((prev) => {
                const first = prev[0] ?? { id: "t-1", latex: "" };
                return [{ ...first, latex }, ...prev.slice(1)];
              });
              setTypedIndex(0);
              setText(latex);
            }}
            className="shrink-0 rounded-full bg-neon/20 px-3 py-1.5 text-[11px] font-bold text-purple-200"
          >
            生成
          </button>
        </div>
      </div>
      {photoRow}
    </div>
  );

  const submitProblem = () => {
    void (async () => {
      setPosting(true);
      setPostError("");
      let payload: Parameters<typeof addProblem>[0];
      if (inputMode === "typed") {
        const joined = typedPages
          .map((p) => p.latex.trim())
          .filter(Boolean)
          .join("\n\n");
        if (!joined) {
          setPosting(false);
          setPostError("本文を入力してください");
          return;
        }
        payload = {
          subject,
          text: wrapMathliveLatex(joined),
          title,
          solution: solutionDraft,
          photo,
          isSprint: isSprintProblem,
          format: "typed",
          mode: isSprintProblem ? "question" : postMode,
          correctAnswer: isSprintProblem || postMode !== "challenge" ? null : correctAnswer,
        };
      } else {
        const images = canvasRef.current?.exportPageImages() ?? [];
        const hasInk =
          images.some(Boolean) ||
          pages.some((p) => p.strokes.length > 0 || (p.texts?.length ?? 0) > 0);
        if (!hasInk && !title.trim()) {
          setPosting(false);
          setPostError("キャンバスに書くか、タイトルを入力してください");
          return;
        }
        payload = {
          subject,
          text: title.trim() || "手書きの問題",
          title,
          solution: solutionDraft,
          photo: images.find(Boolean) || photo,
          isSprint: isSprintProblem,
          format: "handwriting",
          mode: isSprintProblem ? "question" : postMode,
          correctAnswer: isSprintProblem || postMode !== "challenge" ? null : correctAnswer,
          pages: pages.map((p, i) => ({
            id: p.id,
            latex: "",
            doodle: i,
            image: images[i] || undefined,
          })),
        };
      }
      if (!isSprintProblem && postMode === "challenge" && !correctAnswer.trim()) {
        setPosting(false);
        setPostError("Challenger モードでは正解の入力が必須です");
        return;
      }
      const res = await addProblem(payload);
      setPosting(false);
      if (res.error) {
        setPostError(res.error);
        return;
      }
      if (res.pulseSubmitted) {
        setPulseToast(
          "問題の応募が完了しました！運営が選別の上、PULSE問題として配信されます",
        );
        window.setTimeout(() => setPulseToast(""), 5000);
        close();
        return;
      }
      close();
    })();
  };

  return (
    <>
    {pulseToast && (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
        <p className="pointer-events-auto max-w-md rounded-2xl border border-aha/40 bg-black/90 px-4 py-3 text-center text-[13px] font-bold text-aha shadow-lg">
          {pulseToast}
        </p>
      </div>
    )}
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
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
            className="flex h-[min(94dvh,100%)] max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-gray-800 bg-black sm:max-h-[min(92dvh,52rem)] sm:rounded-3xl md:max-w-2xl lg:max-w-4xl"
          >
            {openProblem && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between px-4 py-3">
                  <p className="text-sm font-bold">
                    {isSprintProblem ? "21時問題を応募" : "問題を投稿"}
                  </p>
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
                {isSprintProblem && (
                  <p className="mx-4 mb-2 text-[11px] text-muted">
                    応募内容は運営メールへ送られ、選別のうえ PULSE として配信されます。タイムラインにはすぐには載りません。
                  </p>
                )}
                {!isSprintProblem && (
                  <div className="mx-4 mb-2 grid shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setPostMode("question")}
                      className={`rounded-2xl border px-3 py-2 text-left ${
                        postMode === "question"
                          ? "border-aha bg-aha/10"
                          : "border-gray-800 bg-panel"
                      }`}
                    >
                      <p className="text-sm font-bold">教えて！Qraft</p>
                      <p className="text-[11px] leading-snug text-muted">
                        分からない問題や、みんなに解説してほしい問題を投稿します。
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostMode("challenge")}
                      className={`rounded-2xl border px-3 py-2 text-left ${
                        postMode === "challenge"
                          ? "border-orange-400 bg-orange-500/10"
                          : "border-gray-800 bg-panel"
                      }`}
                    >
                      <p className="text-sm font-bold">Challenger</p>
                      <p className="text-[11px] leading-snug text-muted">
                        自分で作った問題と正解を投稿します。（※正解の入力が必須です）
                      </p>
                    </button>
                    {postMode === "challenge" && (
                      <div>
                        <input
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          placeholder="正解"
                          className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
                        />
                        <p className="mt-1 text-[11px] text-muted">※単位は書かなくていいです</p>
                      </div>
                    )}
                  </div>
                )}
                {modeTabs}
                {inputMode === "hand" ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="notebook-stage min-h-0 flex-1">
                      <MultiPageCanvas
                        ref={canvasRef}
                        pages={pages}
                        onChange={setPages}
                        premium={hasPremium}
                      />
                    </div>
                    <div className="shrink-0 px-4 py-2">{extras}</div>
                  </div>
                ) : (
                  <TypedNotebook
                    pages={typedPages}
                    index={typedIndex}
                    onIndex={setTypedIndex}
                    onChangeLatex={(latex) =>
                      setTypedPages((prev) =>
                        prev.map((p, i) => (i === typedIndex ? { ...p, latex } : p)),
                      )
                    }
                    onAddPage={() => {
                      const id = `t-${Date.now()}`;
                      setTypedPages((prev) => [...prev, { id, latex: "" }]);
                      setTypedIndex(typedPages.length);
                    }}
                    onDeletePage={() => {
                      if (typedPages.length <= 1) return;
                      const next = typedPages.filter((_, i) => i !== typedIndex);
                      setTypedPages(next);
                      setTypedIndex(Math.min(typedIndex, next.length - 1));
                    }}
                    footer={extras}
                  />
                )}
                <div className="shrink-0 px-4 py-3">
                  {postError && <p className="mb-2 text-xs text-red-400">{postError}</p>}
                  <button
                    disabled={posting}
                    onClick={submitProblem}
                    className="w-full rounded-full bg-neon py-3 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {posting ? "送信中…" : isSprintProblem ? "運営に応募する" : "投稿する"}
                  </button>
                </div>
              </div>
            )}

            {openSolution && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-800 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {inputMode === "hand" ? (
                      <PenLine size={16} className="shrink-0 text-aha" />
                    ) : (
                      <Keyboard size={16} className="shrink-0 text-aha" />
                    )}
                    <p className="truncate text-sm font-bold">引用して解法を投稿</p>
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
                {modeTabs}
                {inputMode === "hand" ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="max-h-[28%] shrink-0 overflow-y-auto border-b border-gray-800 bg-panel/40 px-3 pb-3 md:max-h-[32%]">
                      <p className="pt-2 text-[10px] font-bold tracking-wide text-muted">
                        引用する問題 · スクロールでいつでも確認できます
                      </p>
                      <QuoteEmbed postId={quotePostId} />
                    </div>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="一言コメント（任意）"
                      className="shrink-0 border-b border-gray-800 bg-transparent px-4 py-2 text-sm outline-none"
                    />
                    <div className="notebook-stage min-h-0 flex-1">
                      <MultiPageCanvas
                        ref={canvasRef}
                        pages={pages}
                        onChange={setPages}
                        premium={hasPremium}
                      />
                    </div>
                    <div className="shrink-0 px-4 py-2">{photoRow}</div>
                  </div>
                ) : (
                  <TypedNotebook
                    pages={typedPages}
                    index={typedIndex}
                    onIndex={setTypedIndex}
                    onChangeLatex={(latex) =>
                      setTypedPages((prev) =>
                        prev.map((p, i) => (i === typedIndex ? { ...p, latex } : p)),
                      )
                    }
                    onAddPage={() => {
                      const id = `t-${Date.now()}`;
                      setTypedPages((prev) => [...prev, { id, latex: "" }]);
                      setTypedIndex(typedPages.length);
                    }}
                    onDeletePage={() => {
                      if (typedPages.length <= 1) return;
                      const next = typedPages.filter((_, i) => i !== typedIndex);
                      setTypedPages(next);
                      setTypedIndex(Math.min(typedIndex, next.length - 1));
                    }}
                    header={
                      <div className="mb-2 shrink-0 rounded-2xl border border-gray-800 bg-panel/40 px-1 pb-1">
                        <p className="px-2 pt-2 text-[10px] font-bold tracking-wide text-muted">
                          引用する問題 · 上にスクロールして確認
                        </p>
                        <QuoteEmbed postId={quotePostId} />
                      </div>
                    }
                    footer={<div className="min-w-0">{photoRow}</div>}
                  />
                )}
                <div className="shrink-0 px-4 py-3">
                  {quotingChallenge && (
                    <div className="mb-3">
                      <input
                        value={solverAnswer}
                        onChange={(e) => setSolverAnswer(e.target.value)}
                        placeholder="あなたの答え"
                        className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
                      />
                      <p className="mt-1 text-[11px] text-muted">※単位は書かなくていいです</p>
                    </div>
                  )}
                  {postError && <p className="mb-2 text-xs text-red-400">{postError}</p>}
                  <button
                    disabled={
                      posting ||
                      (inputMode === "typed" && !typedPages.some((p) => p.latex.trim())) ||
                      (quotingChallenge && !solverAnswer.trim())
                    }
                    onClick={() => {
                      if (!quotePostId) return;
                      void (async () => {
                        setPosting(true);
                        setPostError("");
                        let res: { error?: string };
                        if (inputMode === "typed") {
                          const joined = typedPages
                            .map((p) => p.latex.trim())
                            .filter(Boolean)
                            .join("\n\n");
                          res = await addSolution({
                            subject,
                            text: wrapMathliveLatex(joined),
                            pages: typedPages.map((p, i) => ({
                              id: p.id,
                              latex: wrapMathliveLatex(p.latex),
                              doodle: i,
                            })),
                            problemId: quotePostId,
                            solutionFormat: "typed",
                            photo,
                            solverAnswer: quotingChallenge ? solverAnswer : undefined,
                          });
                        } else {
                          const images = canvasRef.current?.exportPageImages() ?? [];
                          res = await addSolution({
                            subject,
                            text: text.trim() || "引用解法を投稿した。",
                            pages: pages.map((p, i) => ({
                              id: p.id,
                              latex: "",
                              doodle: i,
                              image: images[i] || undefined,
                            })),
                            problemId: quotePostId,
                            solutionFormat: "handwriting",
                            photo,
                            solverAnswer: quotingChallenge ? solverAnswer : undefined,
                          });
                        }
                        setPosting(false);
                        if (res.error) {
                          setPostError(res.error);
                          return;
                        }
                        close();
                      })();
                    }}
                    className="w-full rounded-full bg-aha py-3 text-sm font-bold text-black disabled:opacity-40"
                  >
                    {posting ? "投稿中…" : "引用して公開"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
