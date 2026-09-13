import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import { PUBLIC_FEED_AD_EVERY, type PublicProblemPreview } from "@/lib/public-catalog";

export function PublicProblemFeed({
  problems,
  compact = true,
}: {
  problems: PublicProblemPreview[];
  compact?: boolean;
}) {
  if (problems.length === 0) return null;
  const adsOk = problems.length >= PUBLIC_FEED_AD_EVERY;

  return (
    <section aria-label="公開問題" className="min-w-0 max-w-full overflow-x-hidden">
      {problems.map((preview, index) => (
        <div key={preview.id} className="min-w-0 max-w-full">
          <PublicProblemCard preview={preview} href={`/p/${preview.id}`} compact={compact} />
          {adsOk && (index + 1) % PUBLIC_FEED_AD_EVERY === 0 ? (
            <GoogleAdSlot enabled label="広告" />
          ) : null}
        </div>
      ))}
    </section>
  );
}
