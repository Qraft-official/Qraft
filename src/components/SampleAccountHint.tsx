import { SAMPLE_ACCOUNT_LABEL } from "@/lib/sample-account";

export function SampleAccountHint({ show }: { show?: boolean }) {
  if (!show) return null;
  return <p className="mt-1 text-[11px] text-muted">{SAMPLE_ACCOUNT_LABEL}</p>;
}
