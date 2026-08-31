"use client";

import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "./UserAvatar";

export function UserListModal({
  open,
  title,
  users,
  onClose,
}: {
  open: boolean;
  title: string;
  users: User[];
  onClose: () => void;
}) {
  const { follows, toggleFollow, me } = useApp();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center"
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
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-gray-800 bg-black sm:rounded-3xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-black px-4 py-3">
              <p className="text-sm font-bold">{title}</p>
              <button onClick={onClose} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>
            {users.length === 0 && (
              <p className="px-4 py-8 text-sm text-muted">まだ誰もいません。</p>
            )}
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
                <Link href={`/u/${u.handle}`} onClick={onClose}>
                  <UserAvatar user={u} className="h-11 w-11 text-lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${u.handle}`} onClick={onClose} className="block font-bold">
                    {u.name}
                  </Link>
                  <p className="text-xs text-muted">@{u.handle}</p>
                  <p className="truncate text-[11px] text-muted">{u.school}</p>
                </div>
                {u.id !== me.id && (
                  <button
                    onClick={() => toggleFollow(u.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      follows.includes(u.id) ? "border border-gray-700" : "bg-white text-black"
                    }`}
                  >
                    {follows.includes(u.id) ? "フォロー中" : "フォロー"}
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
