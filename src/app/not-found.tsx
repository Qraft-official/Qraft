import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-sm font-bold text-aha">404</p>
      <h1 className="mt-2 text-2xl font-black">ページが見つかりません</h1>
      <p className="mt-3 text-sm text-muted">指定されたURLは存在しないか、公開されていません。</p>
      <Link href="/" className="mt-6 text-sm font-bold text-sky-400">
        トップへ戻る
      </Link>
    </main>
  );
}
