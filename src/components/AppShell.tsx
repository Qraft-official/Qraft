"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { BottomNav } from "@/components/BottomNav";
import { CreateSheet } from "@/components/CreateSheet";
import { Fab } from "@/components/Fab";
import { FocusBgm } from "@/components/FocusBgm";
import { Onboarding } from "@/components/Onboarding";
import { PaywallModal, PremiumModal } from "@/components/PremiumModal";
import { ReplySheet } from "@/components/ReplySheet";
import { useApp } from "@/lib/store";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, onboarded, profileHydrated, authenticated, openComposer, accentColor } = useApp();
  const path = usePathname();
  const hideChrome = path.startsWith("/sprint");
  const isAuthCallback = path.startsWith("/auth/callback");

  if (isAuthCallback) {
    return <>{children}</>;
  }

  if (!ready || (authenticated && !profileHydrated)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <p className="text-2xl font-black text-aha">Qraft</p>
      </div>
    );
  }

  if (!authenticated) return <AuthScreen />;
  if (!onboarded) return <Onboarding />;

  return (
    <div
      className="mx-auto min-h-dvh max-w-lg bg-black"
      style={{ ["--accent" as string]: accentColor }}
    >
      <FocusBgm />
      {children}
      {!hideChrome && (
        <>
          <div className="h-24" />
          <Fab onClick={() => openComposer({ open: true, mode: "menu" })} />
          <BottomNav />
          <CreateSheet />
          <ReplySheet />
        </>
      )}
      <PremiumModal />
      <PaywallModal />
    </div>
  );
}
