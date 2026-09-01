"use client";

import { SettingsScreen } from "@/components/SettingsScreen";
import { Suspense } from "react";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-center text-sm text-muted">設定を読み込み中…</div>
      }
    >
      <SettingsScreen />
    </Suspense>
  );
}
