import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import { shouldInsertInFeedAd } from "@/lib/adsense";
import { PUBLIC_FEED_AD_EVERY, type PublicProblemPreview } from "@/lib/public-catalog";

export function PublicProblemFeed({
  problems,
  compact = true,
}: {
  problems: PublicProblemPreview[];
  compact?: boolean;
}) {
  if (problems.length === 0) return null;

  return (
    <section aria-label="公開問題" className="min-w-0 max-w-full overflow-x-hidden">
      {problems.map((preview, index) => (
        <div key={preview.id} className="min-w-0 max-w-full">
          <PublicProblemCard preview={preview} href={`/p/${preview.id}`} compact={compact} />
          {shouldInsertInFeedAd(index, problems.length, PUBLIC_FEED_AD_EVERY) ? (
            <GoogleAdSlot enabled label="広告" />
          ) : null}
        </div>
      ))}
    </section>
  );
}
