/** Launch timestamps are fixed JST. Env/DB may delay them, never make them earlier. */
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
  return {
    earlyAccessStart: EARLY_ACCESS_START_ISO,
    publicReleaseAt: PUBLIC_RELEASE_AT_ISO,
    earlyAccessCap: EARLY_ACCESS_CAP_DEFAULT,
  };
}

function laterIso(candidate: string | null | undefined, floorIso: string) {
  const floor = Date.parse(floorIso);
  const parsed = candidate ? Date.parse(candidate) : NaN;
  if (!Number.isFinite(parsed)) return floorIso;
  if (!Number.isFinite(floor) || parsed < floor) return floorIso;
  return new Date(parsed).toISOString();
}

export function clampReleaseSchedule(input: Partial<ReleaseSchedule> | null | undefined): ReleaseSchedule {
  const base = defaultReleaseSchedule();
  const capRaw = Number(input?.earlyAccessCap);
  return {
    earlyAccessStart: laterIso(input?.earlyAccessStart, EARLY_ACCESS_START_ISO),
    publicReleaseAt: laterIso(input?.publicReleaseAt, PUBLIC_RELEASE_AT_ISO),
    earlyAccessCap: Number.isFinite(capRaw) && capRaw > 0 ? capRaw : base.earlyAccessCap,
  };
}

export function scheduleMillis(schedule: ReleaseSchedule) {
  return {
    startMs: Date.parse(schedule.earlyAccessStart),
    publicMs: Date.parse(schedule.publicReleaseAt),
    cap: schedule.earlyAccessCap,
  };
}
