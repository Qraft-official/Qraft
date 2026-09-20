import { CONTACT_EMAIL } from "@/lib/constants";
import Link from "next/link";

const LINKS = [
  { href: "/about", label: "Qraftについて" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
] as const;

/** Compact guest footer. Do not mount next to the logged-in BottomNav. */
export function PublicSiteFooter() {
  return (
    <footer className="border-t border-gray-800 px-4 py-6 text-xs text-muted">
      <p>Qraft（クラフト）· ひらめきを競う問題SNS</p>
      <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="サイト情報">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="text-sky-400">
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-400">
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
