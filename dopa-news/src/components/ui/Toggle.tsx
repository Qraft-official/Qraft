"use client";

export default function Toggle({
  checked,
  onChange,
  label,
  accent = "#4ef5a3",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  accent?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? accent : "rgba(255,255,255,0.13)" }}
    >
      <span
        className="absolute top-[3px] block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: `translateX(${checked ? 23 : 3}px)` }}
      />
    </button>
  );
}
