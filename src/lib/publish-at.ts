/** Regular posts: missing publish_at means listed. PULSE requires a real timestamp. */
export function isPublishAtOpen(publishAt: string | null | undefined, now = Date.now()) {
  if (publishAt == null || publishAt === "") return true;
  const at = Date.parse(publishAt);
  if (!Number.isFinite(at)) return false;
  return at <= now;
}

export function isProblemListedForFeed(
  row: { is_sprint?: boolean | null; publish_at?: string | null },
  now = Date.now(),
) {
  if (row.is_sprint) {
    if (row.publish_at == null || row.publish_at === "") return false;
    return isPublishAtOpen(row.publish_at, now);
  }
  return isPublishAtOpen(row.publish_at, now);
}
