"use client";

import { AuthScreen } from "@/components/AuthScreen";

/** Reuses AuthScreen. Visiting this URL does not grant developer or app access. */
export default function AuthEntryPage() {
  return <AuthScreen accountCreationOpen />;
}
