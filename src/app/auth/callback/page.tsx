"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const goHome = () => {
      if (cancelled) return;
      window.location.replace("/");
    };

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const authError =
          url.searchParams.get("error_description") || url.searchParams.get("error");
        if (authError) {
          if (/unsupported provider/i.test(authError) || /provider is not enabled/i.test(authError)) {
            window.location.replace("/");
            return;
          }
          setError(authError);
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (!data.session) {
          const code = url.searchParams.get("code");
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (cancelled) return;
            if (exchangeError && !/already|invalid request/i.test(exchangeError.message)) {
              setError(exchangeError.message);
              return;
            }
          }
        }
        goHome();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "ログイン処理に失敗しました");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6">
      <p className="text-2xl font-black text-aha">Aha!</p>
      <p className="mt-3 text-center text-sm text-muted">
        {error || "ログインを完了しています…"}
      </p>
      {error && (
        <button
          type="button"
          onClick={() => window.location.replace("/")}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
        >
          ログインへ戻る
        </button>
      )}
    </div>
  );
}
