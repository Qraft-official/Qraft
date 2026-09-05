import type { ProblemMode } from "./challenge";

export type Subject = "math" | "physics" | "chemistry";
export type Tier = 1 | 2 | 3 | 4 | 5;
export type PostKind = "problem" | "solution" | "sprint" | "reply";
export type { ProblemMode };
export type ChallengeGrade = "correct" | "incorrect";
export type FeedTab = "foryou" | "following" | "sprint" | "lounge";
export type HallMode = "problems" | "solutions";

export type Tiers = Record<Subject, Tier>;

export type User = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  school: string;
  avatar: string;
  banner: string;
  accent: string;
  tiers: Tiers;
  age: number | null;
  stats: { calc: number; insight: number; proof: number };
  followerCount: number;
  followingCount: number;
  titles: string[];
  activeTitles: string[];
  analytics: { day: string; solves: number; aha: number }[];
  /** Official / creator verification. Prefer `userIsVerified()`. */
  verified?: boolean;
  isVerified?: boolean;
  /** Qraft-managed fictional account. Shown on profile, excluded from user rankings. */
  isSample?: boolean;
};

export type ProfilePatch = Partial<
  Pick<
    User,
    "name" | "handle" | "bio" | "school" | "avatar" | "banner" | "titles" | "activeTitles" | "age"
  >
>;

export type NotePage = {
  id: string;
  latex: string;
  doodle: number;
  image?: string;
  /** CSS pixel size of the ink bounding box used when rasterizing / displaying. */
  contentWidth?: number;
  contentHeight?: number;
};

export type Post = {
  id: string;
  authorId: string;
  kind: PostKind;
  subject: Subject;
  text: string;
  createdAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  ahaSum: number;
  ahaCount: number;
  eleganceSum: number;
  eleganceCount: number;
  pages?: NotePage[];
  problemId?: string;
  replyToId?: string;
  sprintDay?: string;
  photo?: string;
  solutionFormat?: "handwriting" | "typed";
  title?: string;
  solution?: string;
  isSprint?: boolean;
  /** question = 教えてQrafter!, challenge = Challenger, aha = Aha! */
  problemMode?: ProblemMode;
  /** Author-only. Never sent to other clients from fetch. */
  correctAnswer?: string;
  solverAnswer?: string;
  /** 1–5. Author-selected difficulty. */
  difficultyLevel?: number;
  hints?: string[];
  feltEasy?: number;
  feltNormal?: number;
  feltHard?: number;
  durationSum?: number;
  durationN?: number;
  gradeCorrect?: number;
  gradeN?: number;
  seriesId?: string;
  seriesOrd?: number;
  seriesTitle?: string;
  confusedCount?: number;
  isHardSpotlight?: boolean;
  promoted?: boolean;
  promotedAt?: string;
  challengeGrade?: ChallengeGrade;
};

export type RatingKind = "aha" | "elegance";

export type Stroke = {
  color: string;
  width: number;
  eraser: boolean;
  points: { x: number; y: number }[];
};

export type CanvasText = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  width?: number;
  height?: number;
};

export type CanvasPage = {
  id: string;
  strokes: Stroke[];
  texts?: CanvasText[];
  /** Raster from a previous save; drawn under new ink so it can be edited. */
  backgroundImage?: string;
  backgroundWidth?: number;
  backgroundHeight?: number;
};

export type SprintRecord = {
  dayId: string;
  startedAt: number | null;
  submittedAt: number | null;
  timedOut: boolean;
  pages: CanvasPage[];
};

export type ActivityItem = {
  id: string;
  type: "repost" | "reply" | "follow" | "solution";
  userId: string;
  postId?: string;
  text: string;
  createdAt: string;
};

export type Composer =
  | { open: false }
  | { open: true; mode: "problem"; isSprint?: boolean }
  | { open: true; mode: "solution"; quotePostId: string }
  | { open: true; mode: "reply"; replyToId: string };
