import { SUBJECT_LABEL } from "@/lib/constants";
import { difficultyLabel } from "@/lib/difficulty";
import type { RelatedProblemCard } from "@/lib/related-problems";
import type { ProblemMode } from "@/lib/challenge";
import Link from "next/link";

function modeLabel(mode: ProblemMode, isSprint: boolean) {
  if (isSprint) return "PULSE";
  if (mode === "challenge") return "Challenger";
  if (mode === "aha") return "Aha!";
  return "教えてQrafter!";
}

export function RelatedProblemCards({ items }: { items: RelatedProblemCard[] }) {
  if (!items.length) return null;
  return (
    <section className="border-t border-gray-800 px-4 py-5">
      <h2 className="text-sm font-black">関連する問題</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/p/${item.id}`}
              className="block min-h-11 rounded-2xl border border-gray-800 bg-panel px-3 py-3"
            >
              <p className="text-sm font-black text-white">{item.title}</p>
              <p className="mt-1 text-[11px] text-muted">
                {SUBJECT_LABEL[item.subject]}
                {item.topic ? ` · ${item.topic}` : ""}
                {` · Lv${item.difficultyLevel} ${difficultyLabel(item.difficultyLevel)}`}
                {` · ${modeLabel(item.mode, item.isSprint)}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
