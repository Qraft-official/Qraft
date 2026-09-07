"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/States";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = params.get("next") || "/me";
    const description = params.get("error_description");
    if (description) {
      setError(description);
      return;
    }
    if (!isSupabaseConfigured) {
      router.replace(next);
      return;
    }
    // detectSessionInUrl handles the PKCE exchange; wait for it to settle.
    const timer = setTimeout(() => {
      void getSupabase()
        .auth.getSession()
        .then(({ data }) => {
          router.replace(data.session ? next : "/login");
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      {error ? (
        <div>
          <p className="text-[15px] font-bold text-[#ff5c7a]">ログインできませんでした</p>
          <p className="mt-2 text-[12.5px] text-fg-muted">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-fg-muted">
          <Spinner size={22} />
          <p className="text-[13px]">ログイン処理中…</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center text-fg-faint">
          <Spinner size={22} />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
