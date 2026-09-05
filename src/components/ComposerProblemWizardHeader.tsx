"use client";

const STEP_NAMES = ["問題を作る", "問題の設定", "仕上げ"] as const;

export function ComposerProblemWizardHeader({
  step,
  heading,
}: {
  step: 1 | 2 | 3;
  heading: string;
}) {
  return (
    <div className="min-w-0 flex-1 pr-2">
      <p className="truncate text-sm font-bold">{heading}</p>
      <div className="mt-1 flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${n <= step ? "bg-aha" : "bg-gray-600"}`}
            />
            {n < 3 ? (
              <span className={`h-px min-w-0 flex-1 ${n < step ? "bg-aha/70" : "bg-gray-700"}`} />
            ) : null}
          </span>
        ))}
        <span className="shrink-0 text-[11px] font-bold text-muted">
          {step} / 3
        </span>
      </div>
      <p className="mt-0.5 text-[11px] font-bold text-white">{STEP_NAMES[step - 1]}</p>
    </div>
  );
}
