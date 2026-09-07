import type { Metadata } from "next";
import SearchScreen from "@/components/search/SearchScreen";

export const metadata: Metadata = {
  title: "検索",
  description: "タイトル・要約・人物・企業・キーワードからニュースを探す。",
};

export default function SearchPage() {
  return <SearchScreen />;
}
