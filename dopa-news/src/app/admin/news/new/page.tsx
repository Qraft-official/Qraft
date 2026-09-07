import type { Metadata } from "next";
import NewsEditor from "@/components/admin/NewsEditor";

export const metadata: Metadata = { title: "ニュース作成", robots: { index: false } };

export default function NewNewsPage() {
  return <NewsEditor />;
}
