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

function SsrFallbackChrome({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto min-h-[100vh] min-h-dvh w-full max-w-lg bg-[#0b1220] text-[#e7e9ea] md:max-w-2xl lg:max-w-4xl"
      style={{ minHeight: "100vh", backgroundColor: "#0b1220", color: "#e7e9ea" }}
      suppressHydrationWarning
    >
      <header className="border-b border-gray-700 px-4 py-3" suppressHydrationWarning>
        <p className="text-lg font-black tracking-tight text-white" suppressHydrationWarning>
          Qraft<span className="ml-1" style={{ color: "#ccff00" }}>クラフト</span>
        </p>
        <p className="text-xs" style={{ color: "#8b98a5" }} suppressHydrationWarning>
          STEM creators のためのドパミン SNS
        </p>
      </header>
      {children}
    </div>
  );
}

export function AppShell({
  children,
  adsensePreview = false,
}: {
  children: React.ReactNode;
  adsensePreview?: boolean;
}) {
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

  if (adsensePreview || !mounted || !ready || (authenticated && !profileHydrated)) {
    return (
      <>
        {capture}
        <SsrFallbackChrome>{children}</SsrFallbackChrome>
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
