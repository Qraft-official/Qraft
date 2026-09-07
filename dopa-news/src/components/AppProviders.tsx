"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider } from "@/hooks/use-session";
import { ToastProvider } from "@/hooks/use-toast";

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A failed SW registration must never break the app.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <ServiceWorkerRegistrar />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
