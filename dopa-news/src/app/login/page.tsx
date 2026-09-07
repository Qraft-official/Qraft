import type { Metadata } from "next";
import { Suspense } from "react";
import LoginScreen from "@/components/auth/LoginScreen";
import { Spinner } from "@/components/ui/States";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="pad-nav min-h-dvh">
      <Suspense
        fallback={
          <div className="grid min-h-[60dvh] place-items-center text-fg-faint">
            <Spinner size={22} />
          </div>
        }
      >
        <LoginScreen />
      </Suspense>
    </main>
  );
}
