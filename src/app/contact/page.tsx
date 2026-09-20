import { CANONICAL_ORIGIN, CONTACT_EMAIL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: `Qraftへのお問い合わせは ${CONTACT_EMAIL} までご連絡ください。`,
  alternates: { canonical: `${CANONICAL_ORIGIN}/contact` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "お問い合わせ | Qraft",
    description: `Qraftへのお問い合わせは ${CONTACT_EMAIL} までご連絡ください。`,
    siteName: "Qraft",
    type: "website",
    locale: "ja_JP",
    url: `${CANONICAL_ORIGIN}/contact`,
  },
};

export default function ContactPage() {
  return (
    <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-8">
      <p className="text-sm font-bold tracking-wide text-aha">Qraft（クラフト）</p>
      <h1 className="mt-2 text-2xl font-black text-white">お問い合わせ</h1>
      <p className="mt-4 text-sm leading-relaxed text-[#c5cdd6]">
        サービスに関するご質問、不具合の報告、個人情報の開示等のご請求は、下記のメールアドレスで受け付けています。
      </p>
      <p className="mt-6 text-sm font-bold text-white">Qraft運営事務局</p>
      <p className="mt-2">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-base font-bold text-sky-400">
          {CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        内容を確認のうえ、順次返信します。ログインの有無にかかわらずご連絡いただけます。
      </p>
    </main>
  );
}
