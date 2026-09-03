"use client";

import { LatexText } from "@/lib/latex";
import { useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { CommentThread } from "./CommentThread";
import { UserAvatar } from "./UserAvatar";

export function ReplySheet() {
  const { composer, closeComposer, addReply, getPost, userOf, repliesTo, me } = useApp();
  const open = composer.open && composer.mode === "reply";
  const post = open ? getPost(composer.replyToId) : undefined;
  const author = post ? userOf(post.authorId) : null;
  const [text, setText] = useState("");
  const comments = open ? repliesTo(composer.replyToId).filter((p) => p.kind === "reply") : [];

  const close = () => {
    setText("");
    closeComposer();
  };

  return (
    <AnimatePresence>
      {open && post && author && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[78vh] w-full max-w-lg flex-col rounded-t-3xl border border-gray-800 bg-black"
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <p className="text-sm font-bold">コメント</p>
              <button onClick={close} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-gray-800 px-4 py-3">
              <div className="flex gap-2">
                <UserAvatar user={author} className="h-8 w-8 text-sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold">
                    {author.name} <span className="font-normal text-muted">@{author.handle}</span>
                  </p>
                  <div className="max-h-20 overflow-hidden">
                    <LatexText text={post.text} className="text-xs text-muted" />
                  </div>
                </div>
              </div>
            </div>
            <div className="aha-scroll flex-1 overflow-y-auto px-4 py-3">
              <CommentThread comments={comments} parentAuthorId={post.authorId} />
            </div>
            <div className="flex items-end gap-2 border-t border-gray-800 p-3">
              <UserAvatar user={me} className="h-8 w-8 text-sm" />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="コメントを書く… $E=mc^2$ も可"
                className="h-16 flex-1 resize-none rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm outline-none"
              />
              <button
                disabled={!text.trim()}
                onClick={() => {
                  addReply({ replyToId: post.id, text: text.trim() });
                  setText("");
                }}
                className="rounded-full bg-sky-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                送信
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
