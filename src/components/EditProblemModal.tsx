"use client";

import { emptyCanvasPage, pageHasInk } from "@/lib/draw-canvas";
import { notePagesToCanvasPages } from "@/lib/problem-images";
import { useApp } from "@/lib/store";
import type { CanvasPage, Post, ProblemMode } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MultiPageCanvasHandle } from "./MultiPageCanvas";

const MultiPageCanvas = dynamic(
  () => import("./MultiPageCanvas").then((m) => m.MultiPageCanvas),
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
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ProblemMode>("question");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [canvasPages, setCanvasPages] = useState<CanvasPage[]>([emptyCanvasPage("page-1")]);
  const canvasRef = useRef<MultiPageCanvasHandle>(null);
  const handwriting = post ? isHandwritingPost(post) : false;

  useEffect(() => {
    if (!open || !post) return;
    setTitle(post.title ?? "");
    setText(bodyFromPost(post));
    setMode(post.problemMode ?? "question");
    setCorrectAnswer(post.correctAnswer ?? "");
    setCanvasPages(notePagesToCanvasPages(post.pages, post.photo));
    setError("");
    setSaving(false);
  }, [open, post]);

  if (!post) return null;

  const save = async () => {
    if (mode === "challenge" && !correctAnswer.trim()) {
      setError("Challenger モードでは正解の入力が必須です");
      return;
    }
    setSaving(true);
    setError("");

    if (handwriting) {
      const hasInk = canvasPages.some((p) => pageHasInk(p));
      if (!hasInk && !title.trim()) {
        setSaving(false);
        setError("キャンバスに書くか、タイトルを入力してください");
        return;
      }
      const images = (await canvasRef.current?.exportPageBlobs()) ?? [];
      const size = canvasRef.current?.getContentSize() ?? { w: 800, h: 280 };
      const res = await updateProblem(post.id, {
        title,
        text: text.trim() || title.trim() || "手書きの問題",
        mode,
        correctAnswer: mode === "challenge" ? correctAnswer : null,
        format: "handwriting",
        drawingBlobs: images,
        pages: canvasPages.map((p, i) => ({
          id: p.id,
          latex: "",
          doodle: i,
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
      return;
    }

    if (!text.trim() && !title.trim()) {
      setSaving(false);
      setError("本文またはタイトルを入力してください");
      return;
    }
    const res = await updateProblem(post.id, {
      title,
      text: text.trim() || title.trim(),
      mode,
      correctAnswer: mode === "challenge" ? correctAnswer : null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-3xl border border-gray-800 bg-black p-4 sm:max-w-[640px] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">問題を編集</p>
              <button type="button" onClick={onClose} className="rounded-full p-1 text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setMode("question")}
                className={`rounded-2xl border px-3 py-2 text-left ${
                  mode === "question" ? "border-aha bg-aha/10" : "border-gray-800 bg-panel"
                }`}
              >
                <p className="text-sm font-bold">教えてQrafter!</p>
                <p className="text-[11px] text-muted">
                  解き方やアドバイスを求めたい時に選ぶモードです。
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("challenge")}
                className={`rounded-2xl border px-3 py-2 text-left ${
                  mode === "challenge" ? "border-orange-400 bg-orange-500/10" : "border-gray-800 bg-panel"
                }`}
              >
                <p className="text-sm font-bold">Challenger</p>
                <p className="text-[11px] text-muted">
                  自分で作成した問題にみんなで挑戦してもらうモードです。
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("aha")}
                className={`rounded-2xl border px-3 py-2 text-left ${
                  mode === "aha"
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-gray-800 bg-panel"
                }`}
              >
                <p className="text-sm font-bold">Aha!</p>
                <p className="text-[11px] text-muted">
                  小学校6年生までの知識で解けるひらめき・パズル要素のある問題モードです。
                </p>
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル（任意）"
              className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
            />
            {handwriting ? (
              <div className="notebook-stage min-h-0">
                <MultiPageCanvas
                  ref={canvasRef}
                  pages={canvasPages}
                  onChange={setCanvasPages}
                  premium={hasPremium}
                />
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="問題文"
                rows={6}
                className="w-full resize-none rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
              />
            )}
            {mode === "challenge" && (
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
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="w-full rounded-full bg-neon py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving ? "保存中…" : "保存する"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
