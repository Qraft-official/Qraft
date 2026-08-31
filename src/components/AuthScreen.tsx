"use client";

import { formatAuthError } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "login" | "signup";

export function AuthScreen() {
  const { signUpWithEmail, signInWithEmail } = useApp();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromUrl =
        url.searchParams.get("error_description") || url.searchParams.get("error");
      if (fromUrl) {
        setError(formatAuthError(fromUrl));
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        url.searchParams.delete("error_code");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSubmit = async () => {
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const res =
          (await signUpWithEmail({
            email,
            password,
            name: name.trim() || undefined,
            handle: handle.trim().replace(/^@/, "") || undefined,
          })) ?? {};
        if (res.error) {
          setError(formatAuthError(res.error));
          return;
        }
        if (res.needsConfirm) {
          setInfo("確認メールを送りました。メール内のリンクを開いてからログインしてください。");
          setMode("login");
        }
      } else {
        const res = (await signInWithEmail({ email, password })) ?? {};
        if (res.error) setError(formatAuthError(res.error));
      }
    } catch (err) {
      setError(
        formatAuthError(err instanceof Error ? err.message : "処理に失敗しました"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-8 py-10">
        <div className="mt-8">
          <p className="text-5xl">✨</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Aha!<span className="ml-1 text-aha">アハ！</span>
          </h1>
          <p className="mt-4 text-2xl font-black leading-snug">
            いま、起きている
            <br />
            「わかった」を追おう。
          </p>
        </div>

        <form
          className="mt-10 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <p className="text-xl font-black">
            {mode === "login" ? "メールでログイン" : "メールでアカウント作成"}
          </p>

          {mode === "signup" && (
            <>
              <label className="block text-xs text-muted">
                表示名
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
                  placeholder="アハ太郎"
                  autoComplete="name"
                />
              </label>
              <label className="block text-xs text-muted">
                ハンドル
                <div className="mt-1 flex items-center rounded-xl border border-gray-800 bg-panel px-3">
                  <span className="text-muted">@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                    className="w-full bg-transparent py-3 text-sm text-white outline-none"
                    placeholder="aha_taro"
                    autoComplete="username"
                  />
                </div>
              </label>
            </>
          )}

          <label className="block text-xs text-muted">
            メールアドレス
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 text-sm text-white outline-none"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="block text-xs text-muted">
            パスワード
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-panel px-3 py-3 pr-12 text-sm text-white outline-none"
                placeholder={mode === "signup" ? "6文字以上" : ""}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-white"
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {info && <p className="text-xs text-aha">{info}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-aha py-3 text-sm font-black text-black disabled:opacity-50"
          >
            {busy
              ? mode === "login"
                ? "ログイン中…"
                : "作成中…"
              : mode === "login"
                ? "ログイン"
                : "登録する"}
          </motion.button>
        </form>

        <p className="mt-6 pb-8 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              初めての方は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setInfo("");
                }}
                className="font-bold text-sky-400"
              >
                アカウント作成
              </button>
            </>
          ) : (
            <>
              すでにアカウントがある場合は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setInfo("");
                }}
                className="font-bold text-sky-400"
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
