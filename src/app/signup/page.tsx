import { AuthScreen } from "@/components/AuthScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新規登録",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <AuthScreen initialMode="signup" />;
}
