"use client";

import { SUBJECTS, SUBJECT_LABEL } from "@/lib/constants";
import { emptyCanvasPage, sharedTypedHeight } from "@/lib/draw-canvas";
import {
  canvasPagesHaveInk,
  HANDWRITING_EXPORT_ERROR,
  packHandwritingExport,
} from "@/lib/handwriting-export";
import { confirmDialog, choiceDialog } from "@/lib/app-dialog";
import { COMPOSER_KB_DOCK_ID, dismissComposerKeyboard } from "@/lib/composer-keyboard";
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
import { ComposerProblemWizardHeader } from "./ComposerProblemWizardHeader";
import { HintEditor } from "./HintEditor";
import { ImageUploadSection } from "./ImageUploadSection";
import type { MultiPageCanvasHandle } from "./MultiPageCanvas";
import { ComposerExpandOverlay } from "./NotebookExpandControls";
import { ProblemModePicker } from "./ProblemModePicker";
import { QuoteEmbed } from "./QuoteEmbed";
import type { TextSizeId } from "@/lib/text-size";
import type { TypedPage } from "./TypedNotebook";

const MultiPageCanvas = dynamic(
  () => import("./MultiPageCanvas").then((m) => m.MultiPageCanvas),
  { ssr: false, loading: () => <div className="h-full min-h-[8rem] rounded-xl bg-panel/80" /> },
);

const TypedNotebook = dynamic(
  () => import("./TypedNotebook").then((m) => m.TypedNotebook),
  { ssr: false, loading: () => <div className="h-40 rounded-xl bg-panel/80" /> },
);

const MODE_SUMMARY: Record<ProblemMode, string> = {
  question: "教えてQrafter",
  challenge: "Challenger",
  aha: "Aha",
};

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
  const [exportingDraw, setExportingDraw] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [pages, setPages] = useState<CanvasPage[]>([emptyCanvasPage("page-1")]);
  const [inputMode, setInputMode] = useState<"hand" | "typed">("hand");
  const [typedPages, setTypedPages] = useState<TypedPage[]>([{ id: "t-1", latex: "" }]);
  const [typedIndex, setTypedIndex] = useState(0);
  const [notebookTextSize, setNotebookTextSize] = useState<TextSizeId>("md");
  const [postMode, setPostMode] = useState<ProblemMode>("question");
  const [difficultyLevel, setDifficultyLevel] = useState<Tier>(3);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [solverAnswer, setSolverAnswer] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [pulseToast, setPulseToast] = useState("");
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [problemStep, setProblemStep] = useState<1 | 2 | 3>(1);
  const [stepHint, setStepHint] = useState("");
  const canvasRef = useRef<MultiPageCanvasHandle>(null);
  const capturedDrawingRef = useRef<ReturnType<typeof packHandwritingExport> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const postingRef = useRef(false);
  const touchYRef = useRef(0);
  const problemStepRef = useRef(problemStep);
  problemStepRef.current = problemStep;
  const closingRef = useRef(false);
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
      const top = window.visualViewport?.offsetTop ?? 0;
      root.style.setProperty("--composer-vvh", `${Math.round(h)}px`);
      root.style.setProperty("--composer-vv-top", `${Math.round(top)}px`);
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
      root.style.removeProperty("--composer-vv-top");
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
      setProblemStep(1);
      setStepHint("");
      setNotebookTextSize("md");
      capturedDrawingRef.current = null;
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
    capturedDrawingRef.current = null;
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
    if (d.notebookTextSize) setNotebookTextSize(d.notebookTextSize);
    if (d.step === 1 || d.step === 2 || d.step === 3) setProblemStep(d.step);
    setStepHint("");
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
        notebookTextSize,
        step: openProblem ? problemStep : undefined,
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
    notebookTextSize,
    problemStep,
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

  const close = () => {
    closingRef.current = true;
    if (history.state && (history.state as { qraftComposer?: boolean }).qraftComposer) {
      history.back();
    }
    closeComposer();
  };

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

  const persistDraftNow = () => {
    if (!me.id) return;
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
      notebookTextSize,
      step: openProblem ? problemStep : undefined,
    };
    if (!draftIsEmpty(draft)) writeComposerDraft(draft);
  };

  const requestClose = useCallback(() => {
    if (postingRef.current) return;
    void (async () => {
      if (!isDirty()) {
        close();
        return;
      }
      persistDraftNow();
      const pick = await choiceDialog({
        title: "投稿を閉じますか？",
        message: "入力内容は下書きに残せます。破棄するとこの下書きは消えます。",
        actions: [
          { id: "save", label: "下書き保存して閉じる", primary: true },
          { id: "discard", label: "破棄する", destructive: true },
          { id: "back", label: "編集に戻る" },
        ],
      });
      if (pick === "save") {
        persistDraftNow();
        close();
      } else if (pick === "discard") {
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
    isSprintProblem,
    subject,
    postMode,
    difficultyLevel,
    inputMode,
    notebookTextSize,
    problemStep,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (openProblem && problemStepRef.current > 1) {
        setStepHint("");
        setProblemStep((s) => (s === 3 ? 2 : 1));
        return;
      }
      requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, openProblem, requestClose]);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!openProblem) return;
    closingRef.current = false;
    const marker = { qraftComposer: true };
    history.pushState(marker, "");
    const onPop = () => {
      if (closingRef.current) return;
      if (problemStepRef.current > 1) {
        setStepHint("");
        setProblemStep((s) => (s === 3 ? 2 : 1));
        history.pushState(marker, "");
        return;
      }
      history.pushState(marker, "");
      requestCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [openProblem]);

  const modeTabs = (
    <ComposerModeTabs
      value={inputMode}
      onChange={(next) => {
        setInputMode(next);
        if (next === "typed") capturedDrawingRef.current = null;
      }}
    />
  );

  const step1Tools = (
    <div className="min-w-0 space-y-2 px-3 pb-2 md:px-4">
      <div>
        <p className="mb-1 flex items-center gap-1 text-xs font-bold">
          <Sparkles size={12} className="text-aha" /> AI問題メーカー
        </p>
        <div className="flex min-w-0 gap-2">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="例: コーシー・シュワルツ"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-800 bg-transparent px-3 text-xs outline-none"
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
              capturedDrawingRef.current = null;
              const latex = toMathliveLatex(g.text);
              setTypedPages((prev) => {
                const first = prev[0] ?? { id: "t-1", latex: "" };
                return [{ ...first, latex }, ...prev.slice(1)];
              });
              setTypedIndex(0);
              setText(latex);
              setStepHint("");
            }}
            className="min-h-11 shrink-0 rounded-full bg-neon/20 px-3 text-xs font-bold text-purple-200"
          >
            生成
          </button>
        </div>
      </div>
      {photoRow}
    </div>
  );

  const hasProblemBody = () => {
    if (photo) return true;
    if (inputMode === "typed") return typedPages.some((p) => p.latex.trim());
    return canvasPagesHaveInk(pages);
  };

  const captureHandwriting = async () => {
    if (!canvasPagesHaveInk(pages)) {
      capturedDrawingRef.current = null;
      return { ok: true as const, packed: null };
    }
    const live = canvasRef.current;
    if (live) {
      try {
        const blobs = await live.exportPageBlobs();
        const size = live.getContentSize();
        const packed = packHandwritingExport(pages, blobs, size);
        if (!packed.drawingBlobs.length) {
          return { ok: false as const, error: HANDWRITING_EXPORT_ERROR };
        }
        capturedDrawingRef.current = packed;
        return { ok: true as const, packed };
      } catch {
        return { ok: false as const, error: HANDWRITING_EXPORT_ERROR };
      }
    }
    if (capturedDrawingRef.current?.drawingBlobs.length) {
      return { ok: true as const, packed: capturedDrawingRef.current };
    }
    return {
      ok: false as const,
      error: "手書きを保存できませんでした。STEP 1に戻って内容を確認してください。",
    };
  };

  const goProblemNext = () => {
    void (async () => {
      if (exportingDraw || posting) return;
      if (problemStep === 1) {
        dismissComposerKeyboard();
        if (!hasProblemBody()) {
          setStepHint("問題を入力してください");
          return;
        }
        if (inputMode === "hand" && canvasPagesHaveInk(pages)) {
          setExportingDraw(true);
          const captured = await captureHandwriting();
          setExportingDraw(false);
          if (!captured.ok) {
            setStepHint(captured.error);
            return;
          }
        }
        setEditorExpanded(false);
        setStepHint("");
        setProblemStep(2);
        return;
      }
      if (!isSprintProblem && postMode === "challenge" && !correctAnswer.trim()) {
        setStepHint("Challenger モードでは正解の入力が必須です");
        return;
      }
      setStepHint("");
      setProblemStep(3);
    })();
  };

  const goProblemBack = () => {
    setStepHint("");
    setProblemStep((s) => (s === 3 ? 2 : 1));
  };

  const submitProblem = () => {
    if (postingRef.current) return;
    postingRef.current = true;
    void (async () => {
      setPosting(true);
      setPostError("");
      if ((isSprintProblem || postMode === "aha") && !correctAnswer.trim()) {
        postingRef.current = false;
        setPosting(false);
        setPostError("答えを入力してください");
        setStepHint("答えを入力してください");
        setProblemStep(3);
        return;
      }
      let payload: Parameters<typeof addProblem>[0];
      if (inputMode === "typed") {
        const joined = typedPages
          .map((p) => p.latex.trim())
          .filter(Boolean)
          .join("\n\n");
        if (!joined) {
          postingRef.current = false;
          setPosting(false);
          setPostError("問題を入力してください");
          setProblemStep(1);
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
          correctAnswer:
            isSprintProblem || postMode === "aha" || postMode === "challenge" ? correctAnswer : null,
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
        const captured = await captureHandwriting();
        if (!captured.ok) {
          postingRef.current = false;
          setPosting(false);
          setPostError(captured.error);
          setStepHint(captured.error);
          setProblemStep(1);
          return;
        }
        const packed = captured.packed;
        if (!packed?.drawingBlobs.length && !photo) {
          postingRef.current = false;
          setPosting(false);
          setPostError("問題を入力してください");
          setProblemStep(1);
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
          correctAnswer:
            isSprintProblem || postMode === "aha" || postMode === "challenge" ? correctAnswer : null,
          difficultyLevel,
          drawingBlobs: packed?.drawingBlobs ?? [],
          pages: packed?.pages ?? [],
          hints: sanitizeHints(hints),
        };
      }
      if (!isSprintProblem && postMode === "challenge" && !correctAnswer.trim()) {
        postingRef.current = false;
        setPosting(false);
        setPostError("Challenger モードでは正解の入力が必須です");
        setStepHint("Challenger モードでは正解の入力が必須です");
        setProblemStep(2);
        return;
      }
      try {
        const res = await addProblem(payload);
        if (res.error) {
          setPostError(res.error);
          setProblemStep(3);
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
        setPulseToast("投稿しました");
        window.setTimeout(() => setPulseToast(""), 1800);
        close();
      } catch {
        setPostError("投稿に失敗しました。通信を確認して再試行してください");
      } finally {
        postingRef.current = false;
        setPosting(false);
      }
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
        className="composer-overlay fixed inset-x-0 z-[60] flex items-center justify-center overflow-hidden overscroll-none bg-black/70 px-2 py-1 md:p-3"
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
            } ${openProblem && problemStep === 1 ? "composer-wizard-s1" : ""}`}
          >
            {openProblem && (
              <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-3 py-1.5 md:px-4">
                  <ComposerProblemWizardHeader
                    step={problemStep}
                    heading={isSprintProblem ? "21時問題を応募" : "問題を投稿"}
                  />
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
                  {inputMode === "hand" && !editorExpanded && (
                    <div
                      className={
                        problemStep === 1
                          ? "flex min-w-0 w-full max-w-full flex-col"
                          : "pointer-events-none h-0 overflow-hidden opacity-0"
                      }
                      aria-hidden={problemStep !== 1}
                    >
                      <div className="notebook-stage mx-3 min-h-0 md:mx-4">
                        <MultiPageCanvas
                          ref={canvasRef}
                          pages={pages}
                          onChange={setPages}
                          premium={hasPremium}
                          textSize={notebookTextSize}
                          onTextSizeChange={setNotebookTextSize}
                          onToggleExpand={() => setEditorExpanded(true)}
                        />
                      </div>
                    </div>
                  )}
                  {problemStep === 1 && (
                    <>
                      {modeTabs}
                      {inputMode === "typed" &&
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
                            expanded={editorExpanded}
                            onToggleExpand={() => setEditorExpanded((v) => !v)}
                            textSize={notebookTextSize}
                            onTextSizeChange={setNotebookTextSize}
                          />
                        )}
                      {step1Tools}
                    </>
                  )}
                  {problemStep === 2 && (
                    <div className="flex flex-col gap-3 px-3 py-2 md:px-4">
                      {isSprintProblem && (
                        <p className="text-xs text-muted">
                          応募内容は運営メールへ送られ、選別のうえ PULSE として配信されます。タイムラインにはすぐには載りません。
                        </p>
                      )}
                      <div>
                        <p className="mb-1.5 text-xs font-bold text-muted">教科</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SUBJECTS.map((s) => {
                            const on = subject === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSubject(s.id)}
                                className={`min-h-12 rounded-xl border px-1 text-sm font-bold ${
                                  on
                                    ? "border-aha bg-aha/15 text-aha"
                                    : "border-gray-800 bg-transparent text-white"
                                }`}
                              >
                                {s.emoji} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-bold text-muted">難易度</p>
                        <div className="grid grid-cols-5 gap-1">
                          {DIFFICULTY_LEVELS.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setDifficultyLevel(d.id)}
                              className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-xs font-bold ${
                                difficultyLevel === d.id
                                  ? "bg-aha text-black"
                                  : "border border-gray-700 text-muted"
                              }`}
                            >
                              <span>{d.label}</span>
                              <span className="text-[10px] font-semibold opacity-80">{d.hint}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {!isSprintProblem && (
                        <div>
                          <p className="mb-1.5 text-xs font-bold text-muted">モード</p>
                          <ProblemModePicker
                            large
                            value={postMode}
                            onChange={(mode) => {
                              setPostMode(mode);
                              setStepHint("");
                            }}
                            correctAnswer={correctAnswer}
                            onCorrectAnswer={setCorrectAnswer}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {problemStep === 3 && (
                    <div className="flex flex-col gap-3 px-3 py-2 md:px-4">
                      <button
                        type="button"
                        onClick={() => setProblemStep(2)}
                        className="min-h-11 rounded-xl border border-gray-800 bg-white/5 px-3 text-left text-sm font-bold text-white"
                      >
                        {SUBJECT_LABEL[subject]}
                        {" · "}
                        Lv{difficultyLevel}
                        {" · "}
                        {isSprintProblem ? "Aha" : MODE_SUMMARY[postMode]}
                      </button>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="タイトル（任意）"
                        className="w-full border-0 border-b border-gray-800 bg-transparent py-2 text-base font-semibold outline-none placeholder:text-muted"
                      />
                      {(postMode === "aha" || isSprintProblem) && (
                        <div>
                          <label className="text-xs font-bold text-muted" htmlFor="composer-aha-answer">
                            答え
                          </label>
                          <input
                            id="composer-aha-answer"
                            value={correctAnswer}
                            onChange={(e) => {
                              setCorrectAnswer(e.target.value);
                              if (stepHint === "答えを入力してください") setStepHint("");
                              if (postError === "答えを入力してください") setPostError("");
                            }}
                            placeholder="答え（必須）"
                            className="mt-0.5 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm outline-none"
                          />
                        </div>
                      )}
                      <textarea
                        value={solutionDraft}
                        onChange={(e) => setSolutionDraft(e.target.value)}
                        placeholder="解答メモ（任意・非公開でも可）"
                        rows={3}
                        className="w-full resize-none border-0 border-b border-gray-800 bg-transparent py-2 text-sm outline-none"
                      />
                      {!isSprintProblem && <HintEditor hints={hints} onChange={setHints} />}
                    </div>
                  )}
                </div>
                {problemStep === 1 ? <div id={COMPOSER_KB_DOCK_ID} className="shrink-0" /> : null}
                <div className="composer-footer flex flex-col gap-1.5 border-t border-gray-800 px-3 py-1.5 md:px-4">
                  {(stepHint || (problemStep === 3 && postError)) && (
                    <p className="text-xs text-red-400">
                      {problemStep === 3 && postError ? postError : stepHint}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {problemStep > 1 && (
                      <button
                        type="button"
                        onClick={goProblemBack}
                        className="inline-flex min-h-11 items-center rounded-full border border-gray-700 px-4 text-sm font-bold text-white"
                      >
                        戻る
                      </button>
                    )}
                    {problemStep < 3 ? (
                      <button
                        type="button"
                        disabled={exportingDraw || posting}
                        onClick={goProblemNext}
                        className={`inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-full bg-aha px-5 text-sm font-bold text-black disabled:opacity-40 ${
                          problemStep === 1 ? "w-full" : "ml-auto"
                        }`}
                      >
                        {exportingDraw ? "保存中…" : "次へ"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={posting}
                        onClick={submitProblem}
                        className="ml-auto inline-flex min-h-11 items-center rounded-full bg-neon px-5 text-sm font-bold text-white disabled:opacity-40"
                      >
                        {posting ? "送信中…" : isSprintProblem ? "応募する" : "投稿する"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {openSolution && (
              <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-800 px-3 py-1.5">
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
                    {!editorExpanded && (
                    <div className="notebook-stage mx-4 min-h-0">
                      <MultiPageCanvas
                        ref={canvasRef}
                        pages={pages}
                        onChange={setPages}
                        premium={hasPremium}
                        textSize={notebookTextSize}
                        onTextSizeChange={setNotebookTextSize}
                        onToggleExpand={() => setEditorExpanded(true)}
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
                    textSize={notebookTextSize}
                    onTextSizeChange={setNotebookTextSize}
                  />
                  )
                )}
                </div>
                <div id={COMPOSER_KB_DOCK_ID} className="shrink-0" />
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
                      if (!quotePostId || postingRef.current) return;
                      postingRef.current = true;
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
                          const captured = await captureHandwriting();
                          if (!captured.ok) {
                            postingRef.current = false;
                            setPosting(false);
                            setPostError(captured.error);
                            return;
                          }
                          const packed = captured.packed;
                          if (!packed?.drawingBlobs.length && !photo && !text.trim()) {
                            postingRef.current = false;
                            setPosting(false);
                            setPostError("手書きを入力してください");
                            return;
                          }
                          res = await addSolution({
                            subject,
                            text: text.trim() || "引用解法を投稿した。",
                            drawingBlobs: packed?.drawingBlobs ?? [],
                            pages: packed?.pages ?? [],
                            problemId: quotePostId,
                            solutionFormat: "handwriting",
                            photo,
                            solverAnswer: quotingChallenge ? solverAnswer : undefined,
                          });
                        }
                        postingRef.current = false;
                        setPosting(false);
                        if (res.error) {
                          setPostError(res.error);
                          return;
                        }
                        clearDraft();
                        setPulseToast("投稿しました");
                        window.setTimeout(() => setPulseToast(""), 1800);
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
                    expanded
                    textSize={notebookTextSize}
                    onTextSizeChange={setNotebookTextSize}
                    onToggleExpand={() => setEditorExpanded(false)}
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
                  onToggleExpand={() => setEditorExpanded(false)}
                  textSize={notebookTextSize}
                  onTextSizeChange={setNotebookTextSize}
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
