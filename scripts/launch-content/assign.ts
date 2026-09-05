import type { LaunchProblem } from "./load-problems";
import type { SampleTrack, SampleUserDef } from "./sample-users";

export type AssignedPost = {
  user: SampleUserDef;
  problem: LaunchProblem;
};

const MAX_POSTS = 4;
const MIN_POSTS = 1;

function prefers(user: SampleUserDef, track: SampleTrack) {
  return user.tracks[0] === track || user.tracks.includes(track);
}

export function assignProblems(users: SampleUserDef[], problems: LaunchProblem[]): AssignedPost[] {
  const counts = new Map<string, number>(users.map((u) => [u.seedKey, 0]));
  const assigned: AssignedPost[] = [];

  const byTrack = new Map<SampleTrack, LaunchProblem[]>();
  for (const problem of problems) {
    const list = byTrack.get(problem.track) ?? [];
    list.push(problem);
    byTrack.set(problem.track, list);
  }

  const takeUser = (track: SampleTrack, excludeFull = true) => {
    const ranked = [...users].sort((a, b) => {
      const pa = prefers(a, track) ? 0 : 1;
      const pb = prefers(b, track) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const ca = counts.get(a.seedKey) ?? 0;
      const cb = counts.get(b.seedKey) ?? 0;
      if (ca !== cb) return ca - cb;
      return a.seedKey.localeCompare(b.seedKey);
    });
    return ranked.find((u) => !excludeFull || (counts.get(u.seedKey) ?? 0) < MAX_POSTS);
  };

  for (const track of ["math", "physics", "chemistry", "logic"] as SampleTrack[]) {
    for (const problem of byTrack.get(track) ?? []) {
      const user = takeUser(track);
      if (!user) continue;
      assigned.push({ user, problem });
      counts.set(user.seedKey, (counts.get(user.seedKey) ?? 0) + 1);
    }
  }

  const leftover = problems.filter((p) => !assigned.some((a) => a.problem.seedKey === p.seedKey));
  for (const problem of leftover) {
    const user = takeUser(problem.track, true) ?? users[0];
    assigned.push({ user, problem });
    counts.set(user.seedKey, (counts.get(user.seedKey) ?? 0) + 1);
  }

  const empty = users.filter((u) => (counts.get(u.seedKey) ?? 0) < MIN_POSTS);
  for (const user of empty) {
    const donor = assigned.find((row) => (counts.get(row.user.seedKey) ?? 0) > MIN_POSTS);
    if (!donor) break;
    counts.set(donor.user.seedKey, (counts.get(donor.user.seedKey) ?? 0) - 1);
    donor.user = user;
    counts.set(user.seedKey, (counts.get(user.seedKey) ?? 0) + 1);
  }

  assigned.sort((a, b) => a.problem.seedKey.localeCompare(b.problem.seedKey));
  return assigned;
}
