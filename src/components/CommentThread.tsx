"use client";

import { LatexText } from "@/lib/latex";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";

export function CommentThread({
  comments,
  compact,
}: {
  comments: Post[];
  compact?: boolean;
}) {
  const { userOf } = useApp();
  if (comments.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted">まだコメントはありません。最初の一言をどうぞ。</p>
    );
  }
  const visible = compact ? comments.slice(0, 4) : comments;
  return (
    <div className="space-y-3 py-2">
      {visible.map((r) => {
        const u = userOf(r.authorId);
        return (
          <div key={r.id} className="flex gap-2">
            <UserAvatar user={u} className="h-8 w-8 text-sm" />
            <div className="min-w-0 flex-1 rounded-2xl bg-white/5 px-3 py-2">
              <p className="text-xs">
                <span className="font-bold text-white">{u.name}</span>{" "}
                <span className="text-muted">@{u.handle}</span>
              </p>
              <LatexText text={r.text} className="mt-0.5 text-[13px]" />
            </div>
          </div>
        );
      })}
      {compact && comments.length > visible.length && (
        <p className="text-[11px] text-muted">ほか {comments.length - visible.length} 件のコメント</p>
      )}
    </div>
  );
}
