import { ProblemGate } from "@/components/ProblemGate";
import { PublicProblemView } from "@/components/PublicProblemView";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemPreview, fetchRelatedPublicProblems } from "@/lib/public-catalog";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const preview = await fetchPublicProblemPreview(id);
  if (!preview) {
    return {
      title: "問題",
      robots: { index: false, follow: true },
    };
  }
  const description = (preview.body || preview.title || "Qraftの公開問題").replace(/\s+/g, " ").trim().slice(0, 160);
  const title = preview.title.trim() || "問題";
  return {
    title,
    description,
    alternates: { canonical: `${CANONICAL_ORIGIN}/p/${preview.id}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Qraft`,
      description,
      siteName: "Qraft",
      type: "article",
      locale: "ja_JP",
      url: `${CANONICAL_ORIGIN}/p/${preview.id}`,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const preview = await fetchPublicProblemPreview(id);
  const related = preview ? await fetchRelatedPublicProblems(preview, 5) : [];
  return (
    <ProblemGate>
      <PublicProblemView preview={preview} related={related} />
    </ProblemGate>
  );
}
