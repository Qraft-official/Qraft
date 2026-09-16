"use client";

import { AuthScreen } from "@/components/AuthScreen";
import { BottomNav } from "@/components/BottomNav";
import { Fab } from "@/components/Fab";
import { InviteCapture } from "@/components/InviteCapture";
import { Onboarding } from "@/components/Onboarding";
import { useApp } from "@/lib/store";
import { rememberPremiumReturnPath } from "@/lib/premium-navigation";
import { isPublicBrowsePath } from "@/lib/public-routes";
import { AppBootSkeleton } from "@/components/UiStates";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg overflow-x-hidden bg-black text-[#e7e9ea] md:max-w-2xl lg:max-w-4xl">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-800 bg-black/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-lg font-black tracking-tight">
          Qraft<span className="ml-1 text-aha">クラフト</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="公開ナビ">
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-muted hover:text-white"
          >
            Discover
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
          >
            ログイン
          </Link>
        </nav>
      </header>
      {children}
      <footer className="border-t border-gray-800 px-4 py-8 text-xs text-muted">
        <p>Qraft（クラフト）· ひらめきを競う問題SNS</p>
        <p className="mt-2 flex flex-wrap gap-3">
          <Link href="/terms" className="text-sky-400">
            利用規約
          </Link>
          <Link href="/privacy" className="text-sky-400">
            プライバシー
          </Link>
        </p>
      </footer>
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
    premiumOpen,
    paywallOpen,
  } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadCreate, setLoadCreate] = useState(false);
  const [loadReply, setLoadReply] = useState(false);
  const [loadPremium, setLoadPremium] = useState(false);
  const [loadPaywall, setLoadPaywall] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(false);
  const hideChrome = path.startsWith("/sprint");
  const isAuthCallback = path.startsWith("/auth/callback");
  const isLegal = path === "/terms" || path === "/privacy";
  const isInvite = path.startsWith("/i/");
  const isDevPreview = process.env.NODE_ENV !== "production" && path.startsWith("/dev/");
  const publicBrowse = isPublicBrowsePath(path);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    rememberPremiumReturnPath(path);
  }, [path]);

  useEffect(() => {
    if (!authenticated) return;
    if (path === "/login" || path === "/signup") router.replace("/");
  }, [authenticated, path, router]);

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

  if (isAuthCallback || isLegal || isInvite || isDevPreview) {
    return (
      <>
        {capture}
        {children}
      </>
    );
  }

  if (!mounted || !ready || (authenticated && !profileHydrated)) {
    if (publicBrowse && !authenticated) {
      return (
        <>
          {capture}
          <PublicChrome>{children}</PublicChrome>
        </>
      );
    }
    return (
      <>
        {capture}
        <div className="mx-auto min-h-dvh w-full max-w-lg bg-black">
          <AppBootSkeleton />
        </div>
      </>
    );
  }

  if (!authenticated) {
    if (isPublicBrowsePath(path)) {
      return (
        <>
          {capture}
          <PublicChrome>{children}</PublicChrome>
        </>
      );
    }
    return (
      <>
        {capture}
        <AuthScreen initialMode={path.startsWith("/signup") ? "signup" : "login"} />
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
