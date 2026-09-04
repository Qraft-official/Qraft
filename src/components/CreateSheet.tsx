"use client";

import { SUBJECTS } from "@/lib/constants";
import { emptyCanvasPage, sharedTypedHeight } from "@/lib/draw-canvas";
import { confirmDialog } from "@/lib/app-dialog";
import { dismissComposerKeyboard } from "@/lib/composer-keyboard";
import { generateAiProblem } from "@/lib/premium";
import { toMathliveLatex, wrapMathliveLatex } from "@/lib/mathlive";
import {
  clearComposerDraft,
  draftIsEmpty,
  readComposerDraft,
  writeComposerDraft,
  type ComposerDraft,
} from "@/lib/composer-draft";
import { sanitizeHints } from "@/lib/learn";
import { useApp } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { CanvasPage, ProblemMode, Subject, Tier } from "@/lib/types";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, PenLine, Sparkles, X, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import { ComposerModeTabs } from "./ComposerModeTabs";
import { HintEditor } from "./HintEditor";
import { ImageUploadSection } from "./ImageUploadSection";
import type { MultiPageCanvasHandle } from "./MultiPageCanvas";
import { ComposerExpandOverlay, NotebookExpandButton } from "./NotebookExpandControls";
import { ProblemModePicker } from "./ProblemModePicker";
import { QuoteEmbed } from "./QuoteEmbed";
import type { TypedPage } from "./TypedNotebook";

const MultiPageCanvas = dynamic(
  () => import("./MultiPageCanvas").then((m) => m.MultiPageCanvas),
  { ssr: false, loading: () => <div className="h-full min-h-[8rem] rounded-xl bg-panel/80" /> },
);

const TypedNotebook = dynamic(
  () => import("./TypedNotebook").then((m) => m.TypedNotebook),
  { ssr: false, loading: () => <div className="h-40 rounded-xl bg-panel/80" /> },
);

export function CreateSheet() {
  const { composer, closeComposer, addProblem, addSolution, getPost, hasPremium, openPaywall, me } =
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
  const [difficultyLevel, setDifficultyLevel] = useState<Tier>(3);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [solverAnswer, setSolverAnswer] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [pulseToast, setPulseToast] = useState("");
  const [editorExpanded, setEditorExpanded] = useState(false);
  const canvasRef = useRef<MultiPageCanvasHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchYRef = useRef(0);
  const quotePost = quotePostId ? getPost(quotePostId) : undefined;
  const quotingChallenge = openSolution && quotePost?.problemMode === "challenge";

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      setEditorExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--composer-vvh", `${Math.round(h)}px`);
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--composer-vvh");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0]?.clientY ?? 0;
    };

    const onMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const dy = touchYRef.current - y;
      touchYRef.current = y;
      const target = e.target;
      if (!(target instanceof Node)) {
        e.preventDefault();
        return;
      }
      if (target instanceof Element && target.closest(".notebook-stage, math-field")) return;
      const scroller = scrollRef.current;
      if (!scroller || !scroller.contains(target)) {
        e.preventDefault();
        return;
      }

      const canScroll = scroller.scrollHeight > scroller.clientHeight + 1;
      if (!canScroll) {
        e.preventDefault();
        return;
      }

      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if ((dy < 0 && atTop) || (dy > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    overlay.addEventListener("touchstart", onStart, { passive: true });
    overlay.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      overlay.removeEventListener("touchstart", onStart);
      overlay.removeEventListener("touchmove", onMove);
    };
  }, [open]);

  const scrollFocusedField = (e: FocusEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!el.closest("input, textarea, select, math-field")) return;
    window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
  };

  const composerSession = openProblem
    ? `problem:${isSprintProblem ? "sprint" : "normal"}`
    : openSolution
      ? `solution:${quotePostId ?? ""}`
      : "";

  useEffect(() => {
    if (!composerSession) return;
    if (composerSession.startsWith("problem")) {
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
      setHints([]);
      return;
    }
    setText("");
    setPhoto(undefined);
    setPages([emptyCanvasPage("page-1")]);
    setTypedPages([{ id: "t-1", latex: "" }]);
    setTypedIndex(0);
    setInputMode("hand");
    setPostError("");
    setPosting(false);
    setSolverAnswer("");
    const q = quotePostId ? getPost(quotePostId) : undefined;
    if (q) setSubject(q.subject);
  }, [composerSession, getPost, quotePostId]);

  const askedRestore = useRef("");
  useEffect(() => {
    if (!open || !composerSession || !me.id) return;
    if (askedRestore.current === composerSession) return;
    askedRestore.current = composerSession;
    const kind = openProblem ? "problem" : "solution";
    const draft = readComposerDraft(me.id, kind, quotePostId);
    if (!draft || draftIsEmpty(draft)) return;
    void confirmDialog({
      title: "前回の下書きを復元しますか？",
      message: "前回入力した内容を戻せます。破棄すると下書きは消えます。",
      confirmLabel: "復元する",
      cancelLabel: "破棄",
    }).then((ok) => {
      if (!ok) {
        clearComposerDraft(me.id, kind, quotePostId);
        return;
      }
      applyDraft(draft);
    });
  }, [composerSession, open, me.id, openProblem, quotePostId]);

  const applyDraft = (d: ComposerDraft) => {
    setTitle(d.title);
    setText(d.text ?? "");
    setSolutionDraft(d.solutionDraft);
    setSubject(d.subject);
    setPostMode(d.postMode);
    setDifficultyLevel(d.difficultyLevel);
    setCorrectAnswer(d.correctAnswer);
    setHints(sanitizeHints(d.hints));
    setInputMode(d.inputMode);
    setTypedPages(d.typedPages.length ? d.typedPages : [{ id: "t-1", latex: "" }]);
    setTypedIndex(0);
    if (d.pages?.length) setPages(d.pages);
    if (d.photo) setPhoto(d.photo);
    if (d.solverAnswer) setSolverAnswer(d.solverAnswer);
  };

  useEffect(() => {
    if (!open || !me.id || posting) return;
    const t = window.setTimeout(() => {
      const kind = openProblem ? "problem" : "solution";
      const draft: ComposerDraft = {
        v: 1,
        userId: me.id,
        kind,
        quotePostId,
        isSprint: isSprintProblem,
        savedAt: Date.now(),
        title,
        subject,
        postMode,
        difficultyLevel,
        correctAnswer,
        solutionDraft,
        hints,
        inputMode,
        typedPages,
        pages,
        photo,
        text,
        solverAnswer,
      };
      if (draftIsEmpty(draft)) return;
      writeComposerDraft(draft);
    }, 900);
    return () => window.clearTimeout(t);
  }, [
    open,
    me.id,
    posting,
    openProblem,
    quotePostId,
    isSprintProblem,
    title,
    subject,
    postMode,
    difficultyLevel,
    correctAnswer,
    solutionDraft,
    hints,
    inputMode,
    typedPages,
    pages,
    photo,
    text,
    solverAnswer,
  ]);

  const attachPhoto = (file: File) => {
    const r = new FileReader();
    r.onerror = () => setPostError("画像の読み込みに失敗しました。もう一度お試しください。");
    r.onload = () => {
      setPhoto(String(r.result));
      setPostError("");
    };
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

  const isDirty = () => {
    if (title.trim() || text.trim() || solutionDraft.trim() || photo || aiPrompt.trim() || correctAnswer.trim() || solverAnswer.trim()) {
      return true;
    }
    if (hints.some((h) => h.trim())) return true;
    if (typedPages.some((p) => p.latex.trim())) return true;
    if (pages.some((p) => p.strokes.length > 0 || (p.texts?.length ?? 0) > 0 || p.backgroundImage)) return true;
    return false;
  };

  const clearDraft = () => {
    if (!me.id) return;
    clearComposerDraft(me.id, openProblem ? "problem" : "solution", quotePostId);
  };

  const requestClose = useCallback(() => {
    if (posting) return;
    void (async () => {
      if (!isDirty()) {
        close();
        return;
      }
      const ok = await confirmDialog({
        title: "下書きを破棄しますか？",
        message: "入力中の問題・手書き・数式は保存されません。",
        confirmLabel: "破棄",
        cancelLabel: "編集を続ける",
        destructive: true,
      });
      if (ok) {
        clearDraft();
        close();
      }
    })();
  }, [
    posting,
    title,
    text,
    solutionDraft,
    photo,
    aiPrompt,
    correctAnswer,
    solverAnswer,
    hints,
    typedPages,
    pages,
    closeComposer,
    me.id,
    openProblem,
    quotePostId,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  const modeTabs = <ComposerModeTabs value={inputMode} onChange={setInputMode} />;

  const extras = (
    <div className="min-w-0 space-y-2">
      <textarea
        value={solutionDraft}
        onChange={(e) => setSolutionDraft(e.target.value)}
        placeholder="解答メモ（任意・非公開でも可）"
        rows={2}
        className="w-full resize-none border-0 border-b border-gray-800 bg-transparent px-0 py-2 text-sm outline-none"
      />
      <div className="border-b border-gray-800 pb-2">
        <p className="mb-1 flex items-center gap-1 text-xs font-bold">
          <Sparkles size={12} className="text-aha" /> AI問題メーカー
        </p>
        <div className="flex min-w-0 gap-2">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="例: コーシー・シュワルツ"
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-1.5 text-xs outline-none"
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
            className="min-h-11 shrink-0 rounded-full bg-neon/20 px-3 text-xs font-bold text-purple-200"
          >
            生成
          </button>
        </div>
      </div>
      {photoRow}
      {!isSprintProblem && <HintEditor hints={hints} onChange={setHints} />}
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
          mode: isSprintProblem ? "aha" : postMode,
          correctAnswer: isSprintProblem || postMode !== "challenge" ? null : correctAnswer,
          difficultyLevel,
          pages: typedPages.map((p, i) => ({
            id: p.id,
            latex: wrapMathliveLatex(p.latex),
            doodle: i,
            contentHeight: sharedTypedHeight(typedPages),
          })),
          hints: sanitizeHints(hints),
        };
      } else {
        const images = (await canvasRef.current?.exportPageBlobs()) ?? [];
        const size = canvasRef.current?.getContentSize() ?? { w: 800, h: 280 };
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
          photo,
          isSprint: isSprintProblem,
          format: "handwriting",
          mode: isSprintProblem ? "aha" : postMode,
          correctAnswer: isSprintProblem || postMode !== "challenge" ? null : correctAnswer,
          difficultyLevel,
          drawingBlobs: images,
          pages: pages.map((p, i) => ({
            id: p.id,
            latex: "",
            doodle: i,
            contentWidth: size.w,
            contentHeight: size.h,
          })),
          hints: sanitizeHints(hints),
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
      clearDraft();
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
          ref={overlayRef}
        className="composer-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none bg-black/70 p-3 md:p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={requestClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`composer-dialog relative mx-auto w-full max-w-lg rounded-2xl border border-gray-800 bg-black md:max-w-[640px] ${
              editorExpanded ? "composer-dialog-expanded" : ""
            }`}
          >
            {openProblem && (
              <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-3 py-2 md:px-4">
                  <div>
                    <p className="text-sm font-bold">
                      {isSprintProblem ? "21時問題を応募" : "問題を投稿"}
                    </p>
                    <p className="text-xs text-muted">
                      {inputMode === "hand" ? "手書きモード" : "打ち込み · 数式キーボード"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => dismissComposerKeyboard()}
                      className="tap-target flex items-center justify-center rounded-full text-muted"
                      aria-label="キーボードを閉じる"
                    >
                      <ChevronDown size={22} />
                    </button>
                    <button
                    type="button"
                    onClick={requestClose}
                    className="tap-target flex items-center justify-center rounded-full text-muted"
                    aria-label="閉じる"
                  >
                    <X size={20} />
                  </button>
                  </div>
                </div>
                <div
                  ref={scrollRef}
                  className="composer-scroll flex w-full min-w-0 max-w-full flex-col gap-1 sm:gap-2"
                  onFocusCapture={scrollFocusedField}
                >
                <label className="sr-only" htmlFor="composer-subject">
                  教科
                </label>
                <select
                  id="composer-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full border-0 border-b border-gray-800 bg-transparent px-3 py-1.5 text-sm outline-none md:px-4"
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
                  className="w-full border-0 border-b border-gray-800 bg-transparent px-3 py-1.5 text-base font-semibold outline-none placeholder:text-muted md:px-4 md:text-lg"
                />
                <div className="border-b border-gray-800 px-3 py-1 md:px-4">
                  <p className="mb-1 text-xs font-bold text-muted">難易度</p>
                  <div className="aha-scroll flex flex-nowrap gap-1 overflow-x-auto pb-0.5">
                    {DIFFICULTY_LEVELS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficultyLevel(d.id)}
                      className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-bold ${
                          difficultyLevel === d.id
                            ? "bg-aha text-black"
                            : "border border-gray-700 text-muted"
                        }`}
                      >
                        {d.label}
                        <span className="hidden sm:inline"> {d.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {isSprintProblem && (
                  <p className="border-b border-gray-800 px-4 py-2 text-xs text-muted">
                    応募内容は運営メールへ送られ、選別のうえ PULSE として配信されます。タイムラインにはすぐには載りません。
                  </p>
                )}
                {!isSprintProblem && (
                  <ProblemModePicker
                    value={postMode}
                    onChange={setPostMode}
                    correctAnswer={correctAnswer}
                    onCorrectAnswer={setCorrectAnswer}
                  />
                )}
                {modeTabs}
                {inputMode === "hand" ? (
                  <div className="flex min-w-0 w-full max-w-full flex-col">
                    <div className="flex shrink-0 justify-end px-2 py-0.5">
                      <NotebookExpandButton onClick={() => setEditorExpanded(true)} />
                    </div>
                    {!editorExpanded && (
                    <div className="notebook-stage mx-4 min-h-0">
                      <MultiPageCanvas
                        ref={canvasRef}
                        pages={pages}
                        onChange={setPages}
                        premium={hasPremium}
                      />
                    </div>
                    )}
                    <div className="border-t border-gray-800 px-4 py-2">
                      <p className="mb-1 text-xs font-bold text-muted">解答メモ・画像・AI</p>
                      {extras}
                    </div>
                  </div>
                ) : (
                  !editorExpanded && (
                  <TypedNotebook
                    pages={typedPages}
                    index={typedIndex}
                    onIndex={setTypedIndex}
                    onChangeLatex={(latex, i = typedIndex) =>
                      setTypedPages((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, latex } : p)),
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
                    expanded={editorExpanded}
                    onToggleExpand={() => setEditorExpanded((v) => !v)}
                  />
                  )
                )}
                </div>
                <div className="composer-footer flex items-center justify-end gap-3 border-t border-gray-800 px-3 py-1.5 md:px-4">
                  {postError && <p className="mr-auto text-xs text-red-400">{postError}</p>}
                  <button
                    disabled={posting}
                    onClick={submitProblem}
                    className="inline-flex min-h-11 items-center rounded-full bg-neon px-5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {posting ? "送信中…" : isSprintProblem ? "応募する" : "投稿する"}
                  </button>
                </div>
              </div>
            )}

            {openSolution && (
              <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-800 px-4 py-2">
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
                      className="max-w-[5.5rem] border-0 bg-transparent px-1 py-1 text-xs outline-none"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => dismissComposerKeyboard()}
                      className="tap-target flex items-center justify-center text-muted"
                      aria-label="キーボードを閉じる"
                    >
                      <ChevronDown size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={requestClose}
                      className="tap-target flex items-center justify-center text-muted"
                      aria-label="閉じる"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div
                  ref={scrollRef}
                  className="composer-scroll flex w-full min-w-0 max-w-full flex-col gap-1 sm:gap-2"
                  onFocusCapture={scrollFocusedField}
                >
                {modeTabs}
                {inputMode === "hand" ? (
                  <div>
                    <div className="border-b border-gray-800 px-4 pb-3">
                      <p className="pt-2 text-xs font-bold tracking-wide text-muted">
                        引用する問題 · スクロールでいつでも確認できます
                      </p>
                      <QuoteEmbed postId={quotePostId} />
                    </div>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="一言コメント（任意）"
                      className="w-full border-b border-gray-800 bg-transparent px-4 py-2 text-sm outline-none"
                    />
                    <div className="flex items-center justify-end px-3 pt-1">
                      <NotebookExpandButton onClick={() => setEditorExpanded(true)} />
                    </div>
                    {!editorExpanded && (
                    <div className="notebook-stage mx-4 min-h-0">
                      <MultiPageCanvas
                        ref={canvasRef}
                        pages={pages}
                        onChange={setPages}
                        premium={hasPremium}
                      />
                    </div>
                    )}
                    <div className="px-4 py-2">{photoRow}</div>
                  </div>
                ) : (
                  !editorExpanded && (
                  <TypedNotebook
                    pages={typedPages}
                    index={typedIndex}
                    onIndex={setTypedIndex}
                    onChangeLatex={(latex, i = typedIndex) =>
                      setTypedPages((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, latex } : p)),
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
                      <div className="mb-2 shrink-0 border-b border-gray-800 px-4 pb-2">
                        <p className="px-2 pt-2 text-xs font-bold tracking-wide text-muted">
                          引用する問題 · 上にスクロールして確認
                        </p>
                        <QuoteEmbed postId={quotePostId} />
                      </div>
                    }
                    footer={<div className="min-w-0">{photoRow}</div>}
                    expanded={false}
                    onToggleExpand={() => setEditorExpanded(true)}
                  />
                  )
                )}
                </div>
                <div className="composer-footer flex flex-col items-stretch gap-2 border-t border-gray-800 px-4 py-2">
                  {quotingChallenge && (
                    <div>
                      <input
                        value={solverAnswer}
                        onChange={(e) => setSolverAnswer(e.target.value)}
                        placeholder="あなたの答え"
                        className="w-full border-0 border-b border-gray-800 bg-transparent px-0 py-2 text-sm outline-none"
                      />
                      <p className="mt-1 text-xs text-muted">※単位は書かなくていいです</p>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-3">
                  {postError && <p className="mr-auto text-xs text-red-400">{postError}</p>}
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
                              contentHeight: sharedTypedHeight(typedPages),
                            })),
                            problemId: quotePostId,
                            solutionFormat: "typed",
                            photo,
                            solverAnswer: quotingChallenge ? solverAnswer : undefined,
                          });
                        } else {
                          const images = (await canvasRef.current?.exportPageBlobs()) ?? [];
                          const size = canvasRef.current?.getContentSize() ?? { w: 800, h: 280 };
                          res = await addSolution({
                            subject,
                            text: text.trim() || "引用解法を投稿した。",
                            drawingBlobs: images,
                            pages: pages.map((p, i) => ({
                              id: p.id,
                              latex: "",
                              doodle: i,
                              contentWidth: size.w,
                              contentHeight: size.h,
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
                        clearDraft();
                        close();
                      })();
                    }}
                    className="inline-flex min-h-11 items-center rounded-full bg-aha px-5 text-sm font-bold text-black disabled:opacity-40"
                  >
                    {posting ? "投稿中…" : "投稿する"}
                  </button>
                  </div>
                </div>
              </div>
            )}
            <ComposerExpandOverlay open={editorExpanded} onClose={() => setEditorExpanded(false)}>
              {inputMode === "hand" ? (
                <div className="notebook-stage notebook-stage-expanded flex min-h-0 flex-1 flex-col">
                  <MultiPageCanvas
                    ref={canvasRef}
                    pages={pages}
                    onChange={setPages}
                    premium={hasPremium}
                    flush
                  />
                </div>
              ) : (
                <TypedNotebook
                  pages={typedPages}
                  index={typedIndex}
                  onIndex={setTypedIndex}
                  onChangeLatex={(latex, i = typedIndex) =>
                    setTypedPages((prev) =>
                      prev.map((p, j) => (j === i ? { ...p, latex } : p)),
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
                  expanded
                />
              )}
            </ComposerExpandOverlay>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
