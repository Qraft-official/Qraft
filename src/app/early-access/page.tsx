"use client";

import { EarlyAccessGate } from "@/components/EarlyAccessGate";
import { fetchAccessStatus } from "@/lib/release-client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { ClientAccess } from "@/lib/release-client";

export default function EarlyAccessPage() {
  const [access, setAccess] = useState<ClientAccess | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAccess(await fetchAccessStatus(session?.access_token));
    })();
  }, []);

  if (!access) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted">読み込み中…</div>
    );
  }
  return <EarlyAccessGate access={access} />;
}
