/** Single source of launch timestamps (JST). Env may override; DB may override at runtime. */
export const EARLY_ACCESS_START_ISO = "2026-09-12T00:00:00+09:00";
export const PUBLIC_RELEASE_AT_ISO = "2026-09-19T00:00:00+09:00";
export const EARLY_ACCESS_CAP_DEFAULT = 30;

export type ReleasePhase = "prelaunch" | "early" | "public";

export type ReleaseSchedule = {
  earlyAccessStart: string;
  publicReleaseAt: string;
  earlyAccessCap: number;
};

export function defaultReleaseSchedule(): ReleaseSchedule {
  const start = process.env.QRAFT_EARLY_ACCESS_START?.trim() || EARLY_ACCESS_START_ISO;
  const pub = process.env.QRAFT_PUBLIC_RELEASE_AT?.trim() || PUBLIC_RELEASE_AT_ISO;
  const capRaw = Number(process.env.QRAFT_EARLY_ACCESS_CAP);
  return {
    earlyAccessStart: start,
    publicReleaseAt: pub,
    earlyAccessCap: Number.isFinite(capRaw) && capRaw > 0 ? capRaw : EARLY_ACCESS_CAP_DEFAULT,
  };
}

export function scheduleMillis(schedule: ReleaseSchedule) {
  return {
    startMs: Date.parse(schedule.earlyAccessStart),
    publicMs: Date.parse(schedule.publicReleaseAt),
    cap: schedule.earlyAccessCap,
  };
}
