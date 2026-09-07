import type { Metadata } from "next";
import ArchiveScreen from "@/components/archive/ArchiveScreen";

export const metadata: Metadata = {
  title: "アーカイブ",
  description: "保存したニュース・閲覧履歴・投票したニュースをまとめて振り返る。",
};

export default function ArchivePage() {
  return <ArchiveScreen />;
}
