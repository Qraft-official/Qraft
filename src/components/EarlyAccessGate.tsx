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
import type { ClientAccess } from "@/lib/release-client";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export function EarlyAccessGate({ access }: { access: ClientAccess }) {
  const { signInWithEmail, refreshAccess } = useApp();
  const [mode, setMode] = useState<"login" | "join">(access.joinOpen ? "join" : "login");
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
        <p className="text-4xl font-black">
          Qraft<span className="ml-1 text-aha">クラフト</span>
        </p>
        <h1 className="mt-6 text-2xl font-black">Qraftは正式公開されました</h1>
        <p className="mt-3 text-sm text-muted">招待コードは不要です。そのまま登録・ログインできます。</p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-aha py-3 text-center text-sm font-black text-black"
        >
          Qraftをはじめる
        </Link>
      </div>
    );
  }

  if (access.phase === "prelaunch") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-8 py-12">
        <p className="text-4xl font-black">
          Qraft<span className="ml-1 text-aha">クラフト</span>
        </p>
        <h1 className="mt-8 text-2xl font-black">先行公開は9月12日からです</h1>
        <p className="mt-3 text-sm text-muted">一般公開の準備中です。開始までしばらくお待ちください。</p>
        <AdminLogin />
      </div>
    );
  }

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
        body: JSON.stringify({
          code: code.trim(),
          email: email.trim(),
          password,
          name: name.trim(),
          handle: sanitizeHandleInput(handle),
        }),
      });
      const json = (await res.json()) as { error?: string; public?: boolean; ok?: boolean };
      if (json.public) {
        window.location.replace("/");
        return;
      }
      if (!res.ok || json.error) {
        setError(formatAuthError(json.error));
        return;
      }
      const signed = await signInWithEmail({ email: email.trim(), password });
      if (signed.error) {
        setError(formatAuthError(signed.error));
        return;
      }
      await refreshAccess();
    } catch (err) {
      setError(formatAuthError(err instanceof Error ? err.message : "参加に失敗しました"));
    } finally {
      setBusy(false);
    }
  };

  const onLogin = async () => {
    setError("");
    if (!email.trim() || !password) return setError("メールアドレスとパスワードを入力してください");
    setBusy(true);
    try {
      const signed = await signInWithEmail({ email: email.trim(), password });
      if (signed.error) {
        setError(formatAuthError(signed.error));
        return;
      }
      await refreshAccess();
    } finally {
      setBusy(false);
    }
  };

  const onRedeem = async () => {
    setError("");
    if (!code.trim()) return setError("招待コードを入力してください");
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/early-access/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = (await res.json()) as { error?: string; public?: boolean };
      if (json.public) {
        window.location.replace("/");
        return;
      }
      if (!res.ok || json.error) {
        setError(formatAuthError(json.error));
        return;
      }
      await refreshAccess();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-8 py-12">
      <p className="text-4xl font-black">
        Qraft<span className="ml-1 text-aha">クラフト</span>
      </p>
      <h1 className="mt-8 text-2xl font-black">先行公開</h1>
      <p className="mt-3 text-sm text-muted">
        この期間の参加は招待コードのみです。定員 {access.cap} 人（残り {access.remaining} 人）。
      </p>
      <p className="mt-1 text-[11px] text-muted">友達紹介コードとは別です。</p>

      <div className="mt-8 flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-full px-4 py-2 font-bold ${mode === "join" ? "bg-white text-black" : "border border-gray-700"}`}
          onClick={() => setMode("join")}
        >
          招待コードで参加
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 font-bold ${mode === "login" ? "bg-white text-black" : "border border-gray-700"}`}
          onClick={() => setMode("login")}
        >
          ログイン
        </button>
      </div>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "join") void onJoin();
          else void onLogin();
        }}
      >
        {mode === "join" && (
          <>
            <label className="block text-xs text-muted">
              Early Access 招待コード
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
                placeholder="招待コード"
                autoComplete="off"
                required
              />
            </label>
            <label className="block text-xs text-muted">
              ユーザーネーム
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
                minLength={DISPLAY_NAME_MIN}
                maxLength={DISPLAY_NAME_MAX}
                title={DISPLAY_NAME_HINT}
                required
              />
            </label>
            <label className="block text-xs text-muted">
              ユーザーID
              <div className="mt-1 flex items-center rounded-xl border border-gray-800 bg-panel px-3">
                <span className="text-muted">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(sanitizeHandleInput(e.target.value))}
                  className="w-full bg-transparent py-3 text-sm text-white outline-none"
                  minLength={HANDLE_MIN}
                  maxLength={HANDLE_MAX}
                  required
                />
              </div>
              <span className="mt-1 block text-[10px] text-muted">{HANDLE_HINT}</span>
            </label>
          </>
        )}
        <label className="block text-xs text-muted">
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
            required
          />
        </label>
        {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        {info && <p className="text-xs text-aha">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {busy ? "処理中…" : mode === "join" ? "招待コードで参加" : "ログイン"}
        </button>
      </form>

      {mode === "login" && (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onRedeem();
          }}
        >
          <p className="text-xs text-muted">ログイン済みでまだ参加枠に入っていない場合</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
            placeholder="招待コードを登録"
            autoComplete="off"
          />
          <button type="submit" className="text-sm font-bold text-sky-400" disabled={busy}>
            コードを登録する
          </button>
        </form>
      )}
    </div>
  );
}

function AdminLogin() {
  const { signInWithEmail, refreshAccess } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-10 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        void signInWithEmail({ email: email.trim(), password })
          .then(async (res) => {
            if (res.error) setError(formatAuthError(res.error));
            else await refreshAccess();
          })
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-xs text-muted">管理者ログイン</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
        placeholder="メール"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
        placeholder="パスワード"
      />
      {error && <p className="text-sm font-bold text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full border border-gray-700 py-3 text-sm font-bold disabled:opacity-50"
      >
        {busy ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
