"use client";

import { PostCard } from "@/components/PostCard";
import { useApp } from "@/lib/store";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getPost, repliesTo } = useApp();
  const post = getPost(id);

  if (!post) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()}>戻る</button>
        <p className="mt-4 text-muted">ポストが見つかりません。</p>
      </div>
    );
  }

  const thread = repliesTo(post.id);
  const sols = thread.filter((p) => p.kind === "solution");
  const replies = thread.filter((p) => p.kind === "reply");

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold">ポスト</p>
      </header>
      <PostCard post={post} />
      {sols.length > 0 && (
        <p className="border-b border-gray-800 px-4 py-2 text-xs font-bold text-muted">
          引用解法
        </p>
      )}
      {sols.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {replies.length > 0 && (
        <p className="border-b border-gray-800 px-4 py-2 text-xs font-bold text-muted">
          リプライ
        </p>
      )}
      {replies.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
