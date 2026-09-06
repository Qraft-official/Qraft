"use client";

import { formatAuthError } from "@/lib/auth";
import { DISPLAY_NAME_HINT, DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, displayNameError } from "@/lib/display-name";
import {
  HANDLE_HINT,
  HANDLE_MAX,
  HANDLE_MIN,
  handleValidationError,
  sanitizeHandleInput,
} from "@/lib/handle";
import { deniedClientAccess, type ClientAccess } from "@/lib/release-client";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export function EarlyAccessGate({ access: accessProp }: { access?: ClientAccess | null }) {
  const { access: storeAccess, signInWithEmail, logout, refreshAccess, authenticated } = useApp();
  const access = accessProp ?? storeAccess ?? deniedClientAccess();
  const [mode, setMode] = useState<"wait" | "login" | "join">(
    access.phase === "early" && access.joinOpen && access.remaining > 0 ? "join" : "wait",
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (access.phase === "public") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-8">
        <p className="text-2xl font-black">
          Qraft<span className="ml-1 text-aha">クラフト</span>
        </p>
        <h1 className="mt-6 text-2xl font-black">Qraftは正式公開されました</h1>
        <p className="mt-3 text-sm text-muted">招待コードは不要です。そのまま登録・ログインできます。</p>
        <Link href="/auth" className="mt-8 rounded-full bg-aha py-3 text-center text-sm font-black text-black">
          Qraftをはじめる
        </Link>
      </div>
    );
  }

  const onLogin = async () => {
    setError("");
    setInfo("");
    if (!email.trim() || !password) return setError("メールアドレスとパスワードを入力してください");
    setBusy(true);
    try {
      const res = await signInWithEmail({ email: email.trim(), password });
      if (res.error) {
        setError(formatAuthError(res.error));
        return;
      }
      await refreshAccess();
    } catch (err) {
      setError(formatAuthError(err instanceof Error ? err.message : "ログインに失敗しました"));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setError("");
    setInfo("");
    const nameErr = displayNameError(name);
    if (nameErr) return setError(nameErr);
    const handleErr = handleValidationError(handle);
    if (handleErr) return setError(handleErr);
    if (!code.trim()) return setError("招待コードを入力してください");
    if (!email.trim() || !password) return setError("メールアドレスとパスワードを入力してください");
    if (password.length < 6) return setError("パスワードは6文字以上にしてください");
    setBusy(true);
    try {
      const res = await fetch("/api/early-access/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          code: code.trim(),
          email: email.trim(),
          password,
          name: name.trim(),
          handle: sanitizeHandleInput(handle),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(body.error || "参加できませんでした");
        return;
      }
      const signed = await signInWithEmail({ email: email.trim(), password });
      if (signed.error) {
        setInfo("参加できました。ログインしてください。");
        return;
      }
      await refreshAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-8 py-12">
      <p className="text-2xl font-black">
        Qraft<span className="ml-1 text-aha">クラフト</span>
      </p>
      {access.phase === "prelaunch" ? (
        <>
          <h1 className="mt-8 text-2xl font-black">Qraftは9月12日から30名限定で先行公開します</h1>
          <p className="mt-3 text-sm text-muted">公開までしばらくお待ちください。ログインしても、この期間は本体へ入れません。</p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-2xl font-black">先行公開は30名限定です</h1>
          <p className="mt-3 text-sm text-muted">
            招待コードをお持ちの方のみ参加できます。残り {access.remaining} / {access.cap} 名。正式公開は9月19日です。
          </p>
        </>
      )}

      <div className="mt-8 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-4 py-2 font-bold ${mode === "login" ? "bg-white text-black" : "border border-gray-700"}`}
        >
          ログイン
        </button>
        {access.phase === "early" && access.joinOpen ? (
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-full px-4 py-2 font-bold ${mode === "join" ? "bg-white text-black" : "border border-gray-700"}`}
          >
            招待コードで参加
          </button>
        ) : (
          <Link href="/auth" className="rounded-full border border-gray-700 px-4 py-2 font-bold">
            アカウント画面
          </Link>
        )}
      </div>

      {mode === "login" && (
        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void onLogin()}
            className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-50"
          >
            ログイン
          </button>
        </div>
      )}

      {mode === "join" && access.phase === "early" && (
        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder="招待コード"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder={DISPLAY_NAME_HINT}
            maxLength={DISPLAY_NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder={`${HANDLE_HINT} (${HANDLE_MIN}〜${HANDLE_MAX})`}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-gray-700 bg-transparent px-4 py-3"
            placeholder="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void onJoin()}
            className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-50"
          >
            参加する
          </button>
        </div>
      )}

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      {info ? <p className="mt-4 text-sm text-aha">{info}</p> : null}

      {authenticated ? (
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-10 text-left text-sm text-muted underline"
        >
          ログアウト
        </button>
      ) : null}
    </div>
  );
}
