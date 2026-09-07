import type { Metadata } from "next";
import NewsEditor from "@/components/admin/NewsEditor";

export const metadata: Metadata = { title: "ニュース編集", robots: { index: false } };

export default async function EditNewsPage(props: PageProps<"/admin/news/[id]">) {
  const { id } = await props.params;
  return <NewsEditor newsId={id} />;
}
