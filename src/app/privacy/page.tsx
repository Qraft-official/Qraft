import { LegalDocument } from "@/components/LegalDocument";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  robots: { index: true, follow: true },
  alternates: { canonical: `${CANONICAL_ORIGIN}/privacy` },
};

export default function PrivacyPage() {
  const markdown = readFileSync(join(process.cwd(), "src/content/qraft_privacy_policy.md"), "utf8");
  return <LegalDocument title="プライバシーポリシー" markdown={markdown} />;
}
