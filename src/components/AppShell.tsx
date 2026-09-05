"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { BottomNav } from "@/components/BottomNav";
import { EarlyAccessGate } from "@/components/EarlyAccessGate";
import { Fab } from "@/components/Fab";
import { InviteCapture } from "@/components/InviteCapture";
import { Onboarding } from "@/components/Onboarding";
import { useApp } from "@/lib/store";
import { rememberPremiumReturnPath } from "@/lib/premium-navigation";
import { AppBootSkeleton } from "@/components/UiStates";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const CreateSheet = dynamic(
  () => import("@/components/CreateSheet").then((m) => m.CreateSheet),
  { ssr: false },
);
const ReplySheet = dynamic(
  () => import("@/components/ReplySheet").then((m) => m.ReplySheet),
  { ssr: false },
);
const PremiumModal = dynamic(
  () => import("@/components/PremiumModal").then((m) => m.PremiumModal),
  { ssr: false },
);
const PaywallModal = dynamic(
  () => import("@/components/PremiumModal").then((m) => m.PaywallModal),
  { ssr: false },
);
const FeedbackModal = dynamic(
  () => import("@/components/FeedbackModal").then((m) => m.FeedbackModal),
  { ssr: false },
);
const FocusBgm = dynamic(
  () => import("@/components/FocusBgm").then((m) => m.FocusBgm),
  { ssr: false },
);

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
    access,
    accessReady,
    openComposer,
    composer,
    accentColor,
    feedbackOpen,
    closeFeedback,
    premiumOpen,
    paywallOpen,
  } = useApp();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const [inAdFrame, setInAdFrame] = useState(false);
  const [loadCreate, setLoadCreate] = useState(false);
  const [loadReply, setLoadReply] = useState(false);
  const [loadPremium, setLoadPremium] = useState(false);
  const [loadPaywall, setLoadPaywall] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(false);
  const hideChrome = path.startsWith("/sprint");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isLegal = path === "/terms" || path === "/privacy";
  const isInvite = path.startsWith("/i/");
  const isEarlyAccess = path.startsWith("/early-access");
  const crawlerSafe = adsensePreview || inAdFrame;

  useEffect(() => {
    setMounted(true);
    try {
      setInAdFrame(window.self !== window.top);
    } catch {
      setInAdFrame(true);
    }
  }, []);

  useEffect(() => {
    rememberPremiumReturnPath(path);
  }, [path]);

  useEffect(() => {
    if (!composer.open) return;
    if (composer.mode === "problem" || composer.mode === "solution") setLoadCreate(true);
    if (composer.mode === "reply") setLoadReply(true);
  }, [composer]);

  useEffect(() => {
    if (premiumOpen) setLoadPremium(true);
  }, [premiumOpen]);
  useEffect(() => {
    if (paywallOpen) setLoadPaywall(true);
  }, [paywallOpen]);
  useEffect(() => {
    if (feedbackOpen) setLoadFeedback(true);
  }, [feedbackOpen]);

  const capture = (
    <Suspense fallback={null}>
      <InviteCapture />
    </Suspense>
  );

  if (isAuthCallback || isLegal || isInvite || isEarlyAccess) {
    return (
      <>
        {capture}
        {children}
      </>
    );
  }

  if (crawlerSafe) {
    return (
      <>
        {capture}
        <SsrFallbackChrome>{children}</SsrFallbackChrome>
      </>
    );
  }

  if (!mounted || !ready || !accessReady || (authenticated && !profileHydrated)) {
    return (
      <>
        {capture}
        <div className="mx-auto min-h-dvh w-full max-w-lg bg-black">
          <AppBootSkeleton />
        </div>
      </>
    );
  }

  if (accessReady && !access) {
    return (
      <>
        {capture}
        <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-8 text-sm text-muted">
          公開状態を確認できません。時間をおいて再度お試しください。
        </div>
      </>
    );
  }

  if (access && !access.canAccess) {
    return (
      <>
        {capture}
        <EarlyAccessGate access={access} />
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
      style={{ ["--accent" as string]: accentColor }}
      suppressHydrationWarning
    >
      <div
        className={`mx-auto min-h-dvh w-full max-w-lg bg-black md:max-w-2xl lg:max-w-4xl ${
          composer.open ? "overflow-hidden" : ""
        }`}
      >
        <FocusBgm />
        {capture}
        {children}
        {!hideChrome && !composer.open && (
          <>
            <div className="h-24" />
            <Fab onClick={() => openComposer({ open: true, mode: "problem" })} />
            <BottomNav />
          </>
        )}
      </div>
      {loadCreate ? <CreateSheet /> : null}
      {loadReply ? <ReplySheet /> : null}
      {loadPremium ? <PremiumModal /> : null}
      {loadPaywall ? <PaywallModal /> : null}
      {loadFeedback ? <FeedbackModal open={feedbackOpen} onClose={closeFeedback} /> : null}
    </div>
  );
}
