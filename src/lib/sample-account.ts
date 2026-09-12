export const SAMPLE_ACCOUNT_LABEL = "Qraft sample";

export function isSampleAccount(user: { isSample?: boolean } | null | undefined) {
  return !!user?.isSample;
}
