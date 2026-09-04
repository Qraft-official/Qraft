"use client";

import { SettingsScreen } from "@/components/SettingsScreen";
import { AppBootSkeleton } from "@/components/UiStates";
import { Suspense } from "react";

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppBootSkeleton />}>
      <SettingsScreen />
    </Suspense>
  );
}
