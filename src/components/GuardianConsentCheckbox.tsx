"use client";

import { GUARDIAN_CONSENT_LABEL } from "@/lib/constants";

export function GuardianConsentCheckbox({
  checked,
  onChange,
  id = "guardian-consent",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-muted">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-aha"
      />
      <span>{GUARDIAN_CONSENT_LABEL}</span>
    </label>
  );
}
