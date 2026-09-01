export type Subject = "math" | "physics" | "chemistry";
export type Tier = 1 | 2 | 3 | 4 | 5;
export type PostKind = "problem" | "solution" | "sprint" | "reply";
export type ProblemMode = "question" | "challenge";
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
  verified?: boolean;
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
  /** question = 教えて！Qraft, challenge = Challenger */
  problemMode?: ProblemMode;
  /** Author-only. Never sent to other clients from fetch. */
  correctAnswer?: string;
  solverAnswer?: string;
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
