"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { BottomNav } from "@/components/BottomNav";
import { CreateSheet } from "@/components/CreateSheet";
import { Fab } from "@/components/Fab";
import { FocusBgm } from "@/components/FocusBgm";
import { InviteCapture } from "@/components/InviteCapture";
import { Onboarding } from "@/components/Onboarding";
import { FeedbackModal } from "@/components/FeedbackModal";
import { PaywallModal, PremiumModal } from "@/components/PremiumModal";
import { ReplySheet } from "@/components/ReplySheet";
import { useApp } from "@/lib/store";
import { rememberPremiumReturnPath } from "@/lib/premium-navigation";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function BootSplash() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-black"
      suppressHydrationWarning
    >
      <p className="text-2xl font-black text-aha" suppressHydrationWarning>
        Qraft
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    ready,
    onboarded,
    profileHydrated,
    authenticated,
    openComposer,
    composer,
    accentColor,
    feedbackOpen,
    closeFeedback,
  } = useApp();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const hideChrome = path.startsWith("/sprint");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isLegal = path === "/terms" || path === "/privacy";
  const isInvite = path.startsWith("/i/");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    rememberPremiumReturnPath(path);
  }, [path]);

  const capture = (
    <Suspense fallback={null}>
      <InviteCapture />
    </Suspense>
  );

  if (isAuthCallback || isLegal || isInvite) {
    return (
      <>
        {capture}
        {children}
      </>
    );
  }

  if (!mounted || !ready || (authenticated && !profileHydrated)) {
    return (
      <>
        {capture}
        <BootSplash />
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        {capture}
        <AuthScreen />
      </>
    );
  }
  if (!onboarded) {
    return (
      <>
        {capture}
        <Onboarding />
      </>
    );
  }

  return (
    <div
      className={`mx-auto min-h-dvh w-full max-w-lg bg-black md:max-w-2xl lg:max-w-4xl ${
        composer.open ? "max-h-dvh overflow-hidden" : ""
      }`}
      style={{ ["--accent" as string]: accentColor }}
      suppressHydrationWarning
    >
      <FocusBgm />
      {capture}
      {children}
      {!hideChrome && (
        <>
          <div className="h-24" />
          <Fab onClick={() => openComposer({ open: true, mode: "problem" })} />
          <BottomNav />
        </>
      )}
      <CreateSheet />
      <ReplySheet />
      <PremiumModal />
      <PaywallModal />
      <FeedbackModal open={feedbackOpen} onClose={closeFeedback} />
    </div>
  );
}
