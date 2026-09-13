import { ProblemGate } from "@/components/ProblemGate";
import { PublicProblemView } from "@/components/PublicProblemView";
import { CANONICAL_ORIGIN } from "@/lib/constants";
import { fetchPublicProblemPreview } from "@/lib/public-catalog";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const preview = await fetchPublicProblemPreview(id);
  if (!preview) {
    return {
      title: "問題 | Qraft",
      robots: { index: false, follow: true },
    };
  }
  const description = (preview.body || preview.title || "Qraftの公開問題").slice(0, 160);
  return {
    title: `${preview.title || "問題"} | Qraft`,
    description,
    alternates: { canonical: `${CANONICAL_ORIGIN}/p/${preview.id}` },
    robots: { index: true, follow: true },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const preview = await fetchPublicProblemPreview(id);
  return (
    <ProblemGate>
      <PublicProblemView preview={preview} />
    </ProblemGate>
  );
}
