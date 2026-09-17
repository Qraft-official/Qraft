"use client";

export function SolverAnswerField({
  id,
  value,
  onChange,
  onSubmit,
  unit,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  unit?: string | null;
  disabled?: boolean;
}) {
  const shown = (unit ?? "").trim();
  return (
    <div className="mt-1 flex min-h-11 items-center rounded-xl border border-gray-800 bg-black px-3">
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!onSubmit) return;
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onSubmit();
        }}
        placeholder="答えを入力"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-muted disabled:opacity-50"
      />
      {shown ? (
        <span className="ml-2 max-w-[4.75rem] shrink-0 truncate text-right text-sm text-white/45">
          {shown}
        </span>
      ) : null}
    </div>
  );
}

export function AuthorAnswerFields({
  answerId,
  unitId,
  answer,
  unit,
  onAnswer,
  onUnit,
  answerLabel,
}: {
  answerId: string;
  unitId: string;
  answer: string;
  unit: string;
  onAnswer: (value: string) => void;
  onUnit: (value: string) => void;
  answerLabel: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-end gap-2">
      <div className="min-w-0">
        <label className="text-xs font-bold text-muted" htmlFor={answerId}>
          {answerLabel}
        </label>
        <input
          id={answerId}
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={`${answerLabel}（必須）`}
          className="mt-0.5 min-h-11 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm outline-none"
        />
      </div>
      <div className="min-w-0">
        <label className="text-xs font-bold text-muted" htmlFor={unitId}>
          単位
        </label>
        <input
          id={unitId}
          value={unit}
          maxLength={12}
          onChange={(e) => onUnit(e.target.value.slice(0, 12))}
          placeholder="任意"
          className="mt-0.5 min-h-11 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm outline-none"
        />
      </div>
    </div>
  );
}
