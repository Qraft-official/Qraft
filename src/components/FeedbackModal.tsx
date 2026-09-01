"use client";

import { sendFeedbackMail } from "@/lib/dev-mail-client";
import { useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORIES = ["フィードバック", "機能リクエスト", "不具合報告"] as const;

export function FeedbackModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { me, refreshNotifications, hasPremium, isDeveloper } = useApp();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("フィードバック");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory("フィードバック");
    setSubject("");
    setMessage("");
    setError("");
    setOk(false);
    setSending(false);
  }, [open]);

  const submit = async () => {
    setError("");
    setOk(false);
    if (!subject.trim() || !message.trim()) {
      setError("件名と本文を入力してください");
      return;
    }
    setSending(true);
    const res = await sendFeedbackMail({
      category,
      subject: subject.trim(),
      message: message.trim(),
      name: me.name,
      handle: me.handle,
    });
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOk(true);
    setSubject("");
    setMessage("");
    void refreshNotifications();
  };

  return (
    <AnimatePresence>
      {open && (hasPremium || isDeveloper) && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-gray-800 bg-black p-4 sm:rounded-3xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 text-lg font-black">
                  <MessageSquarePlus size={18} className="text-aha" />
                  開発者へ送る
                </p>
                <p className="mt-1 text-xs text-muted">
                  フィードバックや機能リクエストを qraft.study@gmail.com にメールします
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>

            <label className="text-[11px] font-bold text-muted">種別</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="mt-1 mb-3 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="text-[11px] font-bold text-muted">件名</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例: 数式エディタに分数テンプレートがほしい"
              className="mt-1 mb-3 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
            />

            <label className="text-[11px] font-bold text-muted">本文</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="詳しく教えてください"
              rows={8}
              className="mt-1 mb-3 w-full resize-none rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
            />

            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
            {ok && (
              <p className="mb-2 text-xs text-aha">送信しました。開発者がメールを確認します。</p>
            )}

            <button
              type="button"
              disabled={sending}
              onClick={() => void submit()}
              className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-40"
            >
              {sending ? "送信中…" : "送信する"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FeedbackEntryButton({ className }: { className?: string }) {
  const { openFeedback, hasPremium, isDeveloper } = useApp();
  if (!hasPremium && !isDeveloper) return null;
  return (
    <button
      type="button"
      onClick={openFeedback}
      className={
        className ??
        "flex w-full items-center justify-center gap-2 rounded-full border border-gray-700 py-3 text-sm font-bold"
      }
    >
      <MessageSquarePlus size={16} />
      開発者へフィードバック・機能リクエストを送る
    </button>
  );
}
