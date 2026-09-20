import { LegalDocument } from "@/components/LegalDocument";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Qraft（クラフト）の利用規約です。",
  robots: { index: true, follow: true },
  alternates: { canonical: `${CANONICAL_ORIGIN}/terms` },
  openGraph: {
    title: "利用規約 | Qraft",
    description: "Qraft（クラフト）の利用規約です。",
    siteName: "Qraft",
    type: "website",
    locale: "ja_JP",
    url: `${CANONICAL_ORIGIN}/terms`,
  },
};

export default function TermsPage() {
  const markdown = readFileSync(join(process.cwd(), "src/content/qraft_terms_of_service.md"), "utf8");
  return <LegalDocument title="利用規約" markdown={markdown} />;
}
