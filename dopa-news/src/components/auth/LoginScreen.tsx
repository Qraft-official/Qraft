"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { DopaLogo } from "@/components/navigation/TopBar";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
const APPLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true";

function friendlyAuthError(message: string): string {
  if (/Invalid login credentials/i.test(message)) return "メールアドレスかパスワードが違います";
  if (/User already registered/i.test(message)) return "このメールアドレスは登録済みです。ログインしてください";
  if (/Password should be at least/i.test(message)) return "パスワードは6文字以上で入力してください";
  if (/Email address .* is invalid/i.test(message)) return "このメールアドレスは使用できません";
  if (/Email not confirmed/i.test(message)) return "確認メールのリンクを開いてから、もう一度ログインしてください";
  if (/rate limit|too many/i.test(message)) return "試行回数が多すぎます。しばらく待ってからお試しください";
  return "認証に失敗しました。時間をおいてもう一度お試しください";
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/me";
  const { user, loading } = useSession();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!isSupabaseConfigured) {
      toast("Supabase が設定されていません", "error");
      return;
    }
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast("メールアドレスの形式を確認してください", "error");
      return;
    }
    if (password.length < 6) {
      toast("パスワードは6文字以上で入力してください", "error");
      return;
    }
    if (mode === "signup" && username.trim().length === 0) {
      toast("ユーザー名を入力してください", "error");
      return;
    }

    setBusy(true);
    setNotice(null);
    const supabase = getSupabase();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { username: username.trim().slice(0, 24) } },
        });
        if (error) throw error;

        if (!data.session) {
          // Projects with email confirmation enabled return no session here.
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (signInError) {
            setNotice(
              "確認メールを送信しました。メール内のリンクを開いたあと、このページからログインしてください。",
            );
            return;
          }
        }
        toast("ようこそ、ドパニュースへ", "success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        toast("ログインしました", "success");
      }
      router.replace(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast(friendlyAuthError(message), "error");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!isSupabaseConfigured) return;
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast("外部ログインを開始できませんでした", "error");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh px-5 pt-4 pad-safe-top">
      <Link
        href={next}
        aria-label="戻る"
        className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-fg-muted active:bg-white/10"
      >
        <ArrowLeft size={19} />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-4"
      >
        <DopaLogo />
        <h1 className="mt-4 text-[24px] font-black leading-tight tracking-tight">
          {mode === "signin" ? "おかえりなさい" : "アカウントを作る"}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
          ニュースを読むだけならログインは不要です。投票・保存・マップ投稿を使うときだけアカウントが必要になります。
        </p>
      </motion.div>

      <div className="mt-5 flex rounded-2xl border border-line bg-ink-800 p-1">
        {(["signin", "signup"] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setNotice(null);
            }}
            className={`relative flex-1 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
              mode === value ? "text-[#08130d]" : "text-fg-muted"
            }`}
          >
            {mode === value && (
              <motion.span
                layoutId="auth-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-[#4ef5a3]"
              />
            )}
            <span className="relative">{value === "signin" ? "ログイン" : "新規登録"}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="text-[12.5px] font-bold text-fg-muted">ユーザー名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 24))}
              autoComplete="nickname"
              placeholder="ドパ太郎"
              className="mt-1.5 w-full rounded-2xl border border-line bg-ink-800 px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-fg-faint focus:border-[#4ef5a3]/50"
            />
          </label>
        )}

        <label className="block">
          <span className="text-[12.5px] font-bold text-fg-muted">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-2xl border border-line bg-ink-800 px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-fg-faint focus:border-[#4ef5a3]/50"
          />
        </label>

        <label className="block">
          <span className="text-[12.5px] font-bold text-fg-muted">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="6文字以上"
            className="mt-1.5 w-full rounded-2xl border border-line bg-ink-800 px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-fg-faint focus:border-[#4ef5a3]/50"
          />
        </label>

        {notice && (
          <p className="rounded-2xl border border-[#35dcff]/30 bg-[#35dcff]/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#35dcff]">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="grad-cta flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-[#07121a] active:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
          {mode === "signin" ? "メールでログイン" : "メールで登録"}
        </button>
      </form>

      {(GOOGLE_ENABLED || APPLE_ENABLED) && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] text-fg-faint">または</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-2.5">
            {GOOGLE_ENABLED && (
              <button
                type="button"
                onClick={() => void oauth("google")}
                disabled={busy}
                className="w-full rounded-2xl border border-line-strong bg-ink-800 py-3.5 text-[14px] font-bold text-fg active:bg-ink-700 disabled:opacity-50"
              >
                Google で続ける
              </button>
            )}
            {APPLE_ENABLED && (
              <button
                type="button"
                onClick={() => void oauth("apple")}
                disabled={busy}
                className="w-full rounded-2xl border border-line-strong bg-ink-800 py-3.5 text-[14px] font-bold text-fg active:bg-ink-700 disabled:opacity-50"
              >
                Apple で続ける
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-fg-faint">
        続行することで
        <Link href="/terms" className="text-fg-muted underline">
          利用規約
        </Link>
        と
        <Link href="/privacy" className="text-fg-muted underline">
          プライバシーポリシー
        </Link>
        に同意したものとみなされます。
      </p>
    </div>
  );
}
