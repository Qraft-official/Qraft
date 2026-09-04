"use client";

import { emptyCanvasPage, pageHasInk, sharedTypedHeight } from "@/lib/draw-canvas";
import { confirmDialog } from "@/lib/app-dialog";
import { COMPOSER_KB_DOCK_ID, dismissComposerKeyboard } from "@/lib/composer-keyboard";
import { toMathliveLatex, wrapMathliveLatex } from "@/lib/mathlive";
import { notePagesToCanvasPages } from "@/lib/problem-images";
import { useApp } from "@/lib/store";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import type { CanvasPage, Post, ProblemMode } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import { ComposerModeTabs } from "./ComposerModeTabs";
import type { MultiPageCanvasHandle } from "./MultiPageCanvas";
import { ComposerExpandOverlay } from "./NotebookExpandControls";
import { ProblemModePicker } from "./ProblemModePicker";
import { HintEditor } from "./HintEditor";
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

function bodyFromPost(post: Post) {
  if (post.title) {
    const prefix = `**${post.title}**\n\n`;
    if (post.text.startsWith(prefix)) return post.text.slice(prefix.length);
  }
  return post.text;
}

function isHandwritingPost(post: Post) {
  if (post.solutionFormat === "handwriting") return true;
  if (post.solutionFormat === "typed") return false;
  return Boolean(post.pages?.some((p) => p.image) || post.photo);
}

function typedPagesFromPost(post: Post): TypedPage[] {
  const pages = post.pages?.filter((p) => p.latex?.trim()) ?? [];
  if (pages.length) {
    return pages.map((p) => ({ id: p.id, latex: toMathliveLatex(p.latex) }));
  }
  const body = toMathliveLatex(bodyFromPost(post));
  return [{ id: "t-1", latex: body }];
}

export function EditProblemModal({
  post,
  open,
  onClose,
}: {
  post: Post | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateProblem, hasPremium } = useApp();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<ProblemMode>("question");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inputMode, setInputMode] = useState<"hand" | "typed">("typed");
  const [pages, setPages] = useState<CanvasPage[]>([emptyCanvasPage("page-1")]);
  const [typedPages, setTypedPages] = useState<TypedPage[]>([{ id: "t-1", latex: "" }]);
  const [typedIndex, setTypedIndex] = useState(0);
  const [notebookTextSize, setNotebookTextSize] = useState<TextSizeId>("md");
  const [editorExpanded, setEditorExpanded] = useState(false);
  const canvasRef = useRef<MultiPageCanvasHandle>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchYRef = useRef(0);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open || !post) return;
    setTitle(post.title ?? "");
    setMode(post.problemMode ?? "question");
    setCorrectAnswer(post.correctAnswer ?? "");
    setHints(post.hints ?? []);
    setError("");
    setSaving(false);
    setEditorExpanded(false);
    setInputMode(isHandwritingPost(post) ? "hand" : "typed");
    setPages(notePagesToCanvasPages(post.pages, post.photo));
    setTypedPages(typedPagesFromPost(post));
    setTypedIndex(0);
  }, [open, post]);

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
      if ((dy < 0 && atTop) || (dy > 0 && atBottom)) e.preventDefault();
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

  const requestClose = useCallback(() => {
    void (async () => {
      if (!post) {
        onClose();
        return;
      }
      const origTyped = typedPagesFromPost(post).map((p) => p.latex);
      const typedDirty =
        typedPages.length !== origTyped.length ||
        typedPages.some((p, i) => p.latex !== (origTyped[i] ?? ""));
      const titleDirty = title.trim() !== (post.title ?? "").trim();
      const modeDirty = mode !== (post.problemMode ?? "question");
      const answerDirty = correctAnswer !== (post.correctAnswer ?? "");
      const hintsDirty = (hints.join("\n") !== (post.hints ?? []).join("\n"));
      const inkDirty = pages.some(
        (p) => p.strokes.length > 0 || (p.texts?.length ?? 0) > 0,
      );
      const formatDirty = (inputMode === "hand") !== isHandwritingPost(post);
      const dirty = titleDirty || modeDirty || answerDirty || hintsDirty || typedDirty || inkDirty || formatDirty;
      if (!dirty) {
        onClose();
        return;
      }
      const ok = await confirmDialog({
        title: "編集を破棄しますか？",
        message: "保存していない変更は失われます。",
        confirmLabel: "破棄",
        cancelLabel: "編集を続ける",
        destructive: true,
      });
      if (ok) onClose();
    })();
  }, [post, title, typedPages, pages, onClose, mode, correctAnswer, inputMode, hints]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!post) return null;

  const save = async () => {
    if (saving) return;
    if (mode === "challenge" && !correctAnswer.trim()) {
      setError("Challenger モードでは正解の入力が必須です");
      return;
    }
    setSaving(true);
    setError("");
    if (inputMode === "typed") {
      const joined = typedPages.map((p) => p.latex.trim()).filter(Boolean).join("\n\n");
      if (!joined && !title.trim()) {
        setSaving(false);
        setError("本文またはタイトルを入力してください");
        return;
      }
      const res = await updateProblem(post.id, {
        title,
        text: wrapMathliveLatex(joined) || title.trim(),
        mode,
        correctAnswer: mode === "challenge" ? correctAnswer : null,
        format: "typed",
        hints,
        pages: typedPages.map((p, i) => ({
          id: p.id,
          latex: wrapMathliveLatex(p.latex),
          doodle: i,
          contentHeight: sharedTypedHeight(typedPages),
        })),
      });
      setSaving(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      onClose();
      return;
    }
    const images = (await canvasRef.current?.exportPageBlobs()) ?? [];
    const size = canvasRef.current?.getContentSize() ?? { w: 800, h: 280 };
    const hasInk = images.some(Boolean) || pages.some((p) => pageHasInk(p));
    if (!hasInk && !title.trim()) {
      setSaving(false);
      setError("キャンバスに書くか、タイトルを入力してください");
      return;
    }
    const res = await updateProblem(post.id, {
      title,
      text: title.trim() || "手書きの問題",
      mode,
      correctAnswer: mode === "challenge" ? correctAnswer : null,
      format: "handwriting",
      hints,
      drawingBlobs: images,
      pages: pages.map((p, i) => ({
        id: p.id,
        latex: "",
        doodle: i,
        image: p.backgroundImage,
        contentWidth: size.w,
        contentHeight: size.h,
      })),
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  const modeTabs = <ComposerModeTabs value={inputMode} onChange={setInputMode} />;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="composer-overlay fixed inset-x-0 z-[70] flex items-center justify-center overflow-hidden overscroll-none bg-black/70 px-2 py-1 md:p-3"
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
            <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-3 py-1.5 md:px-4">
                <p className="text-sm font-bold">問題を編集</p>
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
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タイトル（任意）"
                  className="w-full border-0 border-b border-gray-800 bg-transparent px-3 py-1.5 text-base font-semibold outline-none placeholder:text-muted md:px-4 md:text-lg"
                />
                <ProblemModePicker
                  value={mode}
                  onChange={setMode}
                  correctAnswer={correctAnswer}
                  onCorrectAnswer={setCorrectAnswer}
                />
                <HintEditor hints={hints} onChange={setHints} />
                {modeTabs}
                {inputMode === "hand" ? (
                  <div className="flex min-w-0 w-full max-w-full flex-col">
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
                      expanded={editorExpanded}
                      onToggleExpand={() => setEditorExpanded((v) => !v)}
                      textSize={notebookTextSize}
                      onTextSizeChange={setNotebookTextSize}
                    />
                  )
                )}
              </div>
              <div id={COMPOSER_KB_DOCK_ID} className="shrink-0" />
              <div className="composer-footer flex items-center justify-end gap-3 border-t border-gray-800 px-3 py-1.5 md:px-4">
                {error && <p className="mr-auto text-xs text-red-400">{error}</p>}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex min-h-11 items-center rounded-full bg-neon px-5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {saving ? "保存中…" : "保存する"}
                </button>
              </div>
            </div>
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
  );
}
