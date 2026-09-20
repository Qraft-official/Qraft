import { AuthScreen } from "@/components/AuthScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthScreen />;
}
