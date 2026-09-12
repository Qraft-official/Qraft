/** Server/DB is the source of truth; this mirrors `publish_at IS NULL OR publish_at <= now()`. */
export function isPublishAtOpen(publishAt: string | null | undefined, now = Date.now()) {
  if (publishAt == null || publishAt === "") return true;
  const at = Date.parse(publishAt);
  if (!Number.isFinite(at)) return true;
  return at <= now;
}

export function isProblemListedForFeed(
  row: { is_sprint?: boolean | null; publish_at?: string | null },
  now = Date.now(),
) {
  if (!isPublishAtOpen(row.publish_at, now)) return false;
  if (row.is_sprint) return isPublishAtOpen(row.publish_at, now);
  return true;
}
