"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  checkIsAdmin,
  displayNameFromUser,
  emailRedirectTo,
  ensureProfile,
  formatAuthError,
  SIGNUP_HANDLE_TAKEN,
  handleFromUser,
  fetchLearningProfile,
  saveLearningProfile,
  savePublicProfile,
  searchProfiles,
  sessionUserFields,
  tiersFromProfile,
} from "./auth";
import { displayNameError } from "./display-name";
import { handleValidationError, sanitizeHandleInput } from "./handle";
import { ME_ID, PREMIUM_PRICE_JPY, PREMIUM_TITLES, STORAGE_KEYS } from "./constants";
import { getDeviceIdentity, hasReferralAppliedOnDevice, markReferralAppliedOnDevice, takePendingReferralCode } from "./device-id";
import type { ReferralMe } from "./referral";
import { referralFetch } from "./referral-client";
import {
  isVerifiedCreator,
  isComplimentaryPremiumAccount,
  isDeveloperAccount,
  LOUNGE_POSTS,
  type PremiumStatusPayload,
} from "./premium";
import { userIsVerified } from "./verified";
import {
  communityForDay,
  INITIAL_FOLLOWERS,
  INITIAL_FOLLOWS,
  MOCK_REPLIES,
  POSTS,
  USER_MAP,
} from "./mock-data";
import {
  fallbackUser,
  fetchProblems,
  insertProblem,
  updateProblem as persistProblemUpdate,
  deleteProblem as persistDeleteProblem,
  promoteProblem as persistPromoteProblem,
  type NewProblem,
  type ProblemPatch,
} from "./problems";
import {
  fetchMyConfusedProblemIds,
  notifyConfusedReactors,
  spotlightFromCount,
  toggleConfusedReaction,
} from "./problem-reactions";
import { asDifficulty, MOCK_PROBLEM_META, isProblemUuid } from "./difficulty";
import {
  loadLocalSavedMap,
  overlaySavedMap,
  persistLocalSavedMap,
  saveStateKey,
} from "./save-post";
import {
  fetchLearningBootstrap,
  fetchLearningCardState,
  fetchMySavedMap,
  promptDueRevenge,
  assignProblemSeries,
  setSavedCategory as persistSaveCategory,
  startProblemAttempt,
  submitProblemAttempt,
  toggleAuthorNotify,
  toggleSavedProblem,
  upsertFeltVote,
} from "./learn-client";
import type {
  AttemptSummary,
  FeltVote,
  RevengeItem,
  SaveCategory,
} from "./learn";
import {
  deleteComment as persistDeleteComment,
  fetchComments,
  insertComment as persistInsertComment,
} from "./comments";
import { getSprintDayId, makeOfficialPost, pickAhaPulsePost, remainingMs } from "./sprint";
import { supabase } from "./supabase";
import type {
  ActivityItem,
  CanvasPage,
  Composer,
  Post,
  ProfilePatch,
  RatingKind,
  SprintRecord,
  Subject,
  Tiers,
  User,
} from "./types";
import { sendPulseProblemMail } from "./dev-mail-client";
import { HANDWRITING_UPLOAD_ERROR } from "./handwriting-export";
import { firstDrawingUrl, persistHandwritingPages } from "./problem-images";
import { fetchAccessStatus, type ClientAccess } from "./release-client";
import {
  ensureWelcomeNotification,
  fetchNotifications,
  markNotificationRead as persistNotificationRead,
  type AppNotification,
} from "./notifications";

type Ratings = Record<string, Partial<Record<RatingKind, number>>>;

function overlayPendingSaved(
  incoming: Record<string, SaveCategory>,
  prev: Record<string, SaveCategory>,
  pending: Set<string>,
  sticky: Record<string, boolean>,
) {
  return overlaySavedMap(incoming, prev, pending, sticky);
}

type Store = {
  ready: boolean;
  onboarded: boolean;
  authenticated: boolean;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    name?: string;
    handle?: string;
  }) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signInWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  authViaSupabase: boolean;
  refreshAccess: () => Promise<void>;
  access: ClientAccess | null;
  accessReady: boolean;
  me: User;
  users: User[];
  posts: Post[];
  loungePosts: Post[];
  follows: string[];
  followers: string[];
  likes: string[];
  reposts: string[];
  ratings: Ratings;
  sprint: SprintRecord;
  sprintUnlocked: boolean;
  composer: Composer;
  activities: ActivityItem[];
  completeOnboarding: (input: { age: number; tiers: Tiers }) => Promise<{ error?: string }>;
  toggleFollow: (userId: string) => void;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  rate: (postId: string, kind: RatingKind, stars: number) => void;
  addProblem: (input: NewProblem) => Promise<{
    error?: string;
    mailError?: string;
    pulseSubmitted?: boolean;
  }>;
  updateProblem: (id: string, patch: ProblemPatch) => Promise<{ error?: string }>;
  deleteProblem: (id: string) => Promise<{ error?: string }>;
  promoteProblem: (id: string) => Promise<{ error?: string }>;
  openFeedback: () => void;
  closeFeedback: () => void;
  feedbackOpen: boolean;
  addSolution: (input: {
    subject: Subject;
    text: string;
    pages?: { id: string; latex: string; doodle: number; image?: string; contentWidth?: number; contentHeight?: number }[];
    drawingBlobs?: (Blob | null)[];
    problemId?: string;
    solutionFormat?: "handwriting" | "typed";
    photo?: string;
    solverAnswer?: string;
  }) => Promise<{ error?: string }>;
  addReply: (input: { replyToId: string; text: string }) => Promise<{ error?: string }>;
  deleteComment: (id: string) => Promise<{ error?: string }>;
  startSprint: () => void;
  submitSprint: (pages: CanvasPage[]) => void;
  timeoutSprint: () => void;
  updateSprintPages: (pages: CanvasPage[]) => void;
  officialPost: Post;
  community: Post[];
  updateProfile: (patch: ProfilePatch) => Promise<{ error?: string }>;
  updateLearningSettings: (input: { age: number; tiers: Tiers }) => Promise<{ error?: string }>;
  profileHydrated: boolean;
  openComposer: (next: Exclude<Composer, { open: false }>) => void;
  closeComposer: () => void;
  userOf: (id: string) => User;
  getPost: (id: string) => Post | undefined;
  repliesTo: (postId: string) => Post[];
  isDeveloper: boolean;
  hasPremium: boolean;
  referralMe: ReferralMe | null;
  referralReady: boolean;
  refreshReferral: () => Promise<void>;
  applyReferralCode: (code: string, deviceId?: string) => Promise<{ error?: string }>;
  recordCampaignTap: (type: "x_follow" | "x_post") => Promise<{ error?: string }>;
  subscribed: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  refreshPremiumStatus: () => Promise<PremiumStatusPayload | null>;
  premiumOpen: boolean;
  openPremium: () => void;
  closePremium: () => void;
  paywallOpen: boolean;
  paywallReason: string;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  bgmOn: boolean;
  setBgmOn: (v: boolean) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  react: (postId: string, emoji: string) => void;
  reactions: Record<string, string>;
  authorVerified: (userId: string) => boolean;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  searchUsers: (query: string) => Promise<{ error?: string }>;
  toggleConfused: (postId: string) => Promise<void>;
  confusedMine: Record<string, boolean>;
  saved: Record<string, SaveCategory>;
  toggleSave: (problemId: string, category?: SaveCategory) => Promise<void>;
  setSaveCategory: (problemId: string, category: SaveCategory) => Promise<void>;
  feltVotes: Record<string, FeltVote>;
  voteFeltDifficulty: (problemId: string, vote: FeltVote) => Promise<void>;
  lastAttempts: Record<string, AttemptSummary>;
  attemptStarts: Record<string, string>;
  startAttempt: (problemId: string) => Promise<void>;
  notifyAuthors: string[];
  toggleNotifyAuthor: (authorId: string) => Promise<void>;
  revengeDue: RevengeItem[];
  learnStreak: { current: number; longest: number };
  calendarDays: string[];
  refreshLearn: () => Promise<void>;
  assignToSeries: (
    problemId: string,
    seriesId: string | null,
    seriesTitle?: string,
    ord?: number,
  ) => Promise<{ error?: string }>;
};

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function freshSprint(dayId: string): SprintRecord {
  return {
    dayId,
    startedAt: null,
    submittedAt: null,
    timedOut: false,
    pages: [{ id: "page-1", strokes: [], texts: [] }],
  };
}

const emptyComposer: Composer = { open: false };

async function loadRemoteFeed() {
  const [remote, comments] = await Promise.all([fetchProblems(), fetchComments()]);
  const subjects: Record<string, Subject> = {};
  for (const p of remote.posts) subjects[p.id] = p.subject;
  const commentPosts = comments.posts.map((p) => {
    const parentSubject = p.replyToId ? subjects[p.replyToId] : undefined;
    return parentSubject && parentSubject !== p.subject ? { ...p, subject: parentSubject } : p;
  });
  return {
    posts: [...remote.posts, ...commentPosts],
    profiles: { ...remote.profiles, ...comments.profiles },
    error: remote.error || comments.error,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [access, setAccess] = useState<ClientAccess | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const [tiers, setTiers] = useState<Tiers>(USER_MAP[ME_ID].tiers);
  const [age, setAge] = useState<number | null>(null);
  const [follows, setFollows] = useState<string[]>(INITIAL_FOLLOWS);
  const [likes, setLikes] = useState<string[]>([]);
  const [reposts, setReposts] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  const [extra, setExtra] = useState<Post[]>([]);
  const [hiddenReplyIds, setHiddenReplyIds] = useState<string[]>([]);
  const [remotePosts, setRemotePosts] = useState<Post[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, User>>({});
  const [supabaseUid, setSupabaseUid] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfilePatch>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [composer, setComposer] = useState<Composer>(emptyComposer);
  const [subscribed, setSubscribed] = useState(false);
  const [serverPremium, setServerPremium] = useState<boolean | null>(null);
  const [referralMe, setReferralMe] = useState<ReferralMe | null>(null);
  const [referralReady, setReferralReady] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("この機能は Premium 限定です");
  const [bgmOn, setBgmOnState] = useState(false);
  const [accentColor, setAccentColorState] = useState("#A855F7");
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [confusedMine, setConfusedMine] = useState<Record<string, boolean>>({});
  const [confusedCounts, setConfusedCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, SaveCategory>>({});
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const pendingSaveIds = useRef(new Set<string>());
  const saveLocks = useRef(new Set<string>());
  const stickySave = useRef<Record<string, boolean>>({});
  const [feltVotes, setFeltVotes] = useState<Record<string, FeltVote>>({});
  const [lastAttempts, setLastAttempts] = useState<Record<string, AttemptSummary>>({});
  const [attemptStarts, setAttemptStarts] = useState<Record<string, string>>({});
  const [notifyAuthors, setNotifyAuthors] = useState<string[]>([]);
  const [revengeDue, setRevengeDue] = useState<RevengeItem[]>([]);
  const [learnStreak, setLearnStreak] = useState({ current: 0, longest: 0 });
  const [calendarDays, setCalendarDays] = useState<string[]>([]);
  const [sprint, setSprint] = useState<SprintRecord>(() =>
    freshSprint(getSprintDayId()),
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    const dayId = getSprintDayId();
    setOnboarded(load(STORAGE_KEYS.onboarded, false));
    setTiers(load(STORAGE_KEYS.tiers, USER_MAP[ME_ID].tiers));
    setFollows(load(STORAGE_KEYS.follows, INITIAL_FOLLOWS));
    setLikes(load(STORAGE_KEYS.likes, [] as string[]));
    setReposts(load(STORAGE_KEYS.reposts, [] as string[]));
    setRatings(load(STORAGE_KEYS.ratings, {} as Ratings));
    setExtra(load(STORAGE_KEYS.extraPosts, [] as Post[]));
    setProfile(load(STORAGE_KEYS.profile, {} as ProfilePatch));
    setActivities(load(STORAGE_KEYS.activities, [] as ActivityItem[]));
    setBgmOnState(load(STORAGE_KEYS.bgm, false));
    setAccentColorState(load(STORAGE_KEYS.accent, "#A855F7"));
    setReactions(load(STORAGE_KEYS.reactions, {} as Record<string, string>));
    setSaved(loadLocalSavedMap());
    const saved = load<SprintRecord | null>(STORAGE_KEYS.sprint, null);
    if (saved && saved.dayId === dayId) {
      const timedOut =
        !!saved.startedAt &&
        !saved.submittedAt &&
        remainingMs(saved.startedAt) <= 0;
      setSprint({ ...saved, timedOut: saved.timedOut || timedOut });
    } else {
      setSprint(freshSprint(dayId));
    }

    const hydratedUidRef = { current: null as string | null };

    const applySession = (
      uid: string | null,
      meta?: { name?: string; handle?: string; email?: string | null },
    ) => {
      setSupabaseUid(uid);
      setSessionEmail(meta?.email ?? null);
      if (uid) {
        setAuthenticated(true);
        setProfile((p) => ({
          ...p,
          ...(meta?.name && !p.name ? { name: meta.name } : {}),
          ...(meta?.handle && !p.handle ? { handle: meta.handle } : {}),
        }));
      } else {
        setAuthenticated(false);
        setIsAdmin(false);
        setOnboarded(false);
        setProfileHydrated(true);
        setNotifications([]);
        setReferralMe(null);
        setReferralReady(false);
        setSaved(loadLocalSavedMap());
        setFeltVotes({});
        setLastAttempts({});
        setNotifyAuthors([]);
        setRevengeDue([]);
        setCalendarDays([]);
        setLearnStreak({ current: 0, longest: 0 });
      }
    };

    const hydrateLearning = (user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }) => {
      if (hydratedUidRef.current === user.id) return;
      hydratedUidRef.current = user.id;
      setProfileHydrated(false);
      void (async () => {
        try {
          await ensureProfile(user);
          await ensureWelcomeNotification();
          const [inbox, profileResult, admin, boot, savedMap] = await Promise.all([
            fetchNotifications(),
            fetchLearningProfile(user.id),
            checkIsAdmin(),
            fetchLearningBootstrap(),
            fetchMySavedMap(),
          ]);
          if (cancelled) return;
          if (savedMap) {
            setSaved((prev) =>
              overlayPendingSaved(savedMap, prev, pendingSaveIds.current, stickySave.current),
            );
          }
          setNotifications(inbox);
          setNotifyAuthors(boot.notifyAuthors);
          setRevengeDue(boot.revenge);
          setCalendarDays(boot.calendarDays);
          setLearnStreak({ current: boot.currentStreak, longest: boot.longestStreak });
          void promptDueRevenge().then(() => {
            void fetchNotifications().then((next) => {
              if (!cancelled) setNotifications(next);
            });
          });
          const { data, error } = profileResult;
          if (error) {
            console.warn("Failed to load learning profile:", error.message);
          } else if (data) {
            setOnboarded(!!data.onboarded);
            setTiers(tiersFromProfile(data));
            setAge(typeof data.age === "number" ? data.age : null);
            setProfile((p) => ({
              ...p,
              ...(data.name ? { name: data.name } : {}),
              ...(data.handle ? { handle: data.handle } : {}),
            }));
          } else {
            setOnboarded(false);
          }
          if (!cancelled) setIsAdmin(admin);
        } catch (err) {
          console.warn("Profile hydrate failed:", err);
        } finally {
          if (!cancelled) setProfileHydrated(true);
        }

        const identity = getDeviceIdentity();
        try {
          await referralFetch("/api/referral/event", {
            method: "POST",
            body: JSON.stringify({ type: "login" }),
          });
          const meRes = await referralFetch("/api/referral");
          if (!cancelled && !meRes.error && meRes.data && "code" in meRes.data) {
            setReferralMe(meRes.data as unknown as ReferralMe);
          }
          const pending = takePendingReferralCode();
          const ownCode =
            meRes.data && "code" in meRes.data
              ? String((meRes.data as { code?: string }).code ?? "")
              : "";
          if (
            pending &&
            identity.deviceId &&
            pending.toUpperCase() !== ownCode.toUpperCase() &&
            !hasReferralAppliedOnDevice()
          ) {
            const applied = await referralFetch("/api/referral", {
              method: "POST",
              body: JSON.stringify({
                code: pending,
                deviceId: identity.deviceId,
                deviceFingerprint: identity.deviceFingerprint,
              }),
            });
            if (!cancelled && !applied.error && applied.data && "code" in applied.data) {
              setReferralMe(applied.data as unknown as ReferralMe);
              markReferralAppliedOnDevice();
            }
          }
        } catch (err) {
          console.warn("Referral hydrate failed:", err);
        } finally {
          if (!cancelled) setReferralReady(true);
        }
      })();
    };

    const afterSignIn = (user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }) => {
      hydrateLearning(user);
    };

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = data.session?.user;
        if (user) {
          applySession(user.id, sessionUserFields(user));
          afterSignIn(user);
        } else {
          setAuthenticated(false);
          setProfileHydrated(true);
        }
        const uid = data.session?.user?.id;
        const [remote, mine] = await Promise.all([
          loadRemoteFeed(),
          uid ? fetchMyConfusedProblemIds(uid) : Promise.resolve([] as string[]),
        ]);
        if (cancelled) return;
        setRemotePosts(remote.posts);
        setRemoteUsers(remote.profiles);
        if (remote.error) console.warn("Failed to load problems:", remote.error);
        if (uid) {
          setConfusedMine(Object.fromEntries(mine.map((id) => [id, true])));
        }
      } catch (err) {
        console.warn("Auth bootstrap failed:", err);
        if (!cancelled) {
          setAuthenticated(false);
          setProfileHydrated(true);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === "TOKEN_REFRESHED") return;
        const user = session?.user;
        if (user) {
          applySession(user.id, sessionUserFields(user));
          if (event === "SIGNED_OUT") return;
          afterSignIn(user);
          if (event === "INITIAL_SESSION") return;
          void loadRemoteFeed().then((remote) => {
            setRemotePosts(remote.posts);
            setRemoteUsers((prev) => ({ ...prev, ...remote.profiles }));
          });
          void fetchMyConfusedProblemIds(user.id).then((mine) => {
            setConfusedMine(Object.fromEntries(mine.map((id) => [id, true])));
          });
        } else {
          if (event === "INITIAL_SESSION") return;
          hydratedUidRef.current = null;
          applySession(null);
          setReferralReady(true);
          setConfusedMine({});
        }
      } catch (err) {
        console.warn("onAuthStateChange failed:", err);
      }
    });

    const channel = supabase
      .channel("aha-problems")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "problems" },
        () => {
          void loadRemoteFeed().then((remote) => {
            setRemotePosts(remote.posts);
            setRemoteUsers((prev) => ({ ...prev, ...remote.profiles }));
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!ready || !profileHydrated) return;
    localStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(onboarded));
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(authenticated));
    localStorage.setItem(STORAGE_KEYS.tiers, JSON.stringify(tiers));
    localStorage.setItem(STORAGE_KEYS.follows, JSON.stringify(follows));
    localStorage.setItem(STORAGE_KEYS.likes, JSON.stringify(likes));
    localStorage.setItem(STORAGE_KEYS.reposts, JSON.stringify(reposts));
    localStorage.setItem(STORAGE_KEYS.ratings, JSON.stringify(ratings));
    localStorage.setItem(STORAGE_KEYS.extraPosts, JSON.stringify(extra));
    localStorage.setItem(STORAGE_KEYS.sprint, JSON.stringify(sprint));
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.bgm, JSON.stringify(bgmOn));
    localStorage.setItem(STORAGE_KEYS.accent, JSON.stringify(accentColor));
    localStorage.setItem(STORAGE_KEYS.reactions, JSON.stringify(reactions));
  }, [
    ready,
    profileHydrated,
    onboarded,
    tiers,
    follows,
    likes,
    reposts,
    ratings,
    extra,
    sprint,
    profile,
    activities,
    bgmOn,
    accentColor,
    reactions,
    authenticated,
  ]);

  const isDeveloper = useMemo(() => {
    if (isAdmin) return true;
    const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (sessionEmail && emails.includes(sessionEmail.toLowerCase())) return true;
    const handle = typeof profile.handle === "string" ? profile.handle : undefined;
    if (supabaseUid && isDeveloperAccount(supabaseUid, handle)) return true;
    return false;
  }, [isAdmin, sessionEmail, supabaseUid, profile.handle]);
  const complimentaryPremium = useMemo(() => {
    const base = supabaseUid
      ? (remoteUsers[supabaseUid] ?? fallbackUser(supabaseUid))
      : USER_MAP[ME_ID];
    return isComplimentaryPremiumAccount({
      id: supabaseUid ?? ME_ID,
      handle: typeof profile.handle === "string" ? profile.handle : base.handle,
      name: typeof profile.name === "string" ? profile.name : base.name,
      email: sessionEmail,
    });
  }, [supabaseUid, remoteUsers, profile.handle, profile.name, sessionEmail]);
  const trialPremium = Boolean(
    referralMe?.trialUntil && new Date(referralMe.trialUntil).getTime() > Date.now(),
  );
  const localPremiumHint = isDeveloper || complimentaryPremium || trialPremium;
  const hasPremium = serverPremium === true || (serverPremium === null && localPremiumHint);

  const me: User = useMemo(() => {
    const base = supabaseUid
      ? (remoteUsers[supabaseUid] ?? fallbackUser(supabaseUid))
      : USER_MAP[ME_ID];
    const premium = hasPremium;
    const titles = Array.from(
      new Set([
        ...(Array.isArray(profile.titles) ? profile.titles : base.titles),
        ...(premium ? PREMIUM_TITLES : []),
      ]),
    );
    const activeTitles = Array.isArray(profile.activeTitles)
      ? profile.activeTitles
      : Array.isArray(base.activeTitles)
        ? base.activeTitles
        : [];
    const verified =
      premium ||
      isVerifiedCreator(base.id) ||
      userIsVerified({
        ...base,
        ...profile,
        handle: typeof profile.handle === "string" ? profile.handle : base.handle,
      });
    return {
      ...base,
      ...profile,
      id: supabaseUid ?? ME_ID,
      accent: accentColor || base.accent,
      tiers,
      age: profile.age ?? age ?? base.age ?? null,
      followingCount: follows.length,
      followerCount: INITIAL_FOLLOWERS.length,
      titles,
      activeTitles,
      verified,
      isVerified: verified,
    };
  }, [tiers, age, follows.length, profile, hasPremium, accentColor, supabaseUid, remoteUsers]);

  const userOf = useCallback(
    (id: string) => {
      if (id === me.id) return me;
      if (USER_MAP[id]) return USER_MAP[id];
      if (remoteUsers[id]) return remoteUsers[id];
      return fallbackUser(id);
    },
    [me, remoteUsers],
  );

  const mockOfficial = useMemo(() => makeOfficialPost(sprint.dayId), [sprint.dayId]);
  const community = useMemo(() => communityForDay(sprint.dayId), [sprint.dayId]);
  const officialPost = useMemo(
    () => pickAhaPulsePost(remotePosts, sprint.dayId, mockOfficial),
    [remotePosts, sprint.dayId, mockOfficial],
  );

  const catalog = useMemo(() => {
    const hidden = new Set(hiddenReplyIds);
    return [
      ...remotePosts,
      ...extra,
      mockOfficial,
      ...POSTS,
      ...MOCK_REPLIES,
      ...community,
      ...LOUNGE_POSTS,
    ].filter((p) => !hidden.has(p.id));
  }, [extra, mockOfficial, community, remotePosts, hiddenReplyIds]);

  const posts = useMemo(() => {
    const extras = extra;
    const hidden = new Set(hiddenReplyIds);
    const seen = new Set<string>();
    const main = [...remotePosts, ...extra, mockOfficial, ...POSTS, ...MOCK_REPLIES]
      .filter((p) => {
        if (hidden.has(p.id)) return false;
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return main.map((p) => {
      const mock = MOCK_PROBLEM_META[p.id];
      const baseCount = confusedCounts[p.id] ?? p.confusedCount ?? mock?.confused ?? 0;
      const level = p.difficultyLevel ?? mock?.level ?? 3;
      return {
        ...p,
        difficultyLevel: asDifficulty(level),
        confusedCount: baseCount,
        isHardSpotlight: p.isHardSpotlight || spotlightFromCount(baseCount),
        replyCount:
          p.kind === "reply"
            ? p.replyCount
            : extras.filter((e) => e.kind === "reply" && e.replyToId === p.id && !hidden.has(e.id)).length +
              remotePosts.filter((e) => e.kind === "reply" && e.replyToId === p.id && !hidden.has(e.id)).length +
              MOCK_REPLIES.filter((e) => e.replyToId === p.id && !hidden.has(e.id)).length,
      };
    });
  }, [extra, mockOfficial, remotePosts, confusedCounts, hiddenReplyIds]);

  const getPost = useCallback(
    (id: string) =>
      posts.find((p) => p.id === id) || catalog.find((p) => p.id === id),
    [posts, catalog],
  );

  const repliesTo = useCallback(
    (postId: string) =>
      catalog
        .filter(
          (p) =>
            p.replyToId === postId || (p.kind === "solution" && p.problemId === postId),
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [catalog],
  );

  const completeOnboarding = useCallback(
    async (input: { age: number; tiers: Tiers }) => {
      setAge(input.age);
      setTiers(input.tiers);
      if (supabaseUid) {
        const { error } = await saveLearningProfile(supabaseUid, { ...input, onboarded: true });
        if (error) return { error };
      }
      setOnboarded(true);
      return {};
    },
    [supabaseUid],
  );

  const updateLearningSettings = useCallback(
    async (input: { age: number; tiers: Tiers }) => {
      setAge(input.age);
      setTiers(input.tiers);
      setOnboarded(true);
      if (!supabaseUid) return {};
      const { error } = await saveLearningProfile(supabaseUid, { ...input, onboarded: true });
      return error ? { error } : {};
    },
    [supabaseUid],
  );

  const signUpWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      name?: string;
      handle?: string;
    }) => {
      try {
        const gate = await fetchAccessStatus();
        if (gate && !gate.signupOpen) {
          return { error: "先行公開期間は招待コードから参加してください" };
        }
        const nameErr = displayNameError(input.name ?? "");
        if (nameErr) return { error: nameErr };
        const handle = sanitizeHandleInput(input.handle ?? "");
        const handleErr = handleValidationError(handle);
        if (handleErr) return { error: handleErr };
        const { data: taken } = await supabase
          .from("profiles")
          .select("id")
          .ilike("handle", handle)
          .maybeSingle();
        if (taken) return { error: SIGNUP_HANDLE_TAKEN };
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            emailRedirectTo: emailRedirectTo(),
            data: {
              name: input.name?.trim() || "",
              handle,
            },
          },
        });
        if (error) {
          console.error("[signUp]", {
            message: error.message,
            status: error.status,
            code: error.code,
          });
          return { error: formatAuthError(error.message, error.code) };
        }
        if (!data.session || !data.user || !data.user.email_confirmed_at) {
          return { needsConfirm: true };
        }
        if (data.user) {
          await ensureProfile(data.user);
          await ensureWelcomeNotification();
          const inbox = await fetchNotifications();
          setNotifications(inbox);
          setSupabaseUid(data.user.id);
          setSessionEmail(data.user.email ?? null);
          setAuthenticated(true);
          setOnboarded(false);
          setProfileHydrated(true);
          setProfile((p) => ({
            ...p,
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(handle ? { handle } : {}),
          }));
        }
        return {};
      } catch (err) {
        const thrown = err as { message?: unknown; status?: unknown; code?: unknown };
        console.error("[signUp]", {
          message: thrown.message,
          status: thrown.status,
          code: thrown.code,
        });
        return { error: formatAuthError(err instanceof Error ? err.message : "登録に失敗しました") };
      }
    },
    [],
  );

  const signInWithEmail = useCallback(async (input: { email: string; password: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) return { error: formatAuthError(error.message) };
      if (data.user) {
        const fields = sessionUserFields(data.user);
        setSupabaseUid(data.user.id);
        setSessionEmail(fields.email);
        setAuthenticated(true);
        setProfile((p) => ({
          ...p,
          ...(fields.name ? { name: fields.name } : {}),
          ...(fields.handle ? { handle: fields.handle } : {}),
        }));
        window.setTimeout(() => {
          setProfileHydrated(false);
          void (async () => {
            await ensureProfile(data.user);
            await ensureWelcomeNotification();
            const inbox = await fetchNotifications();
            setNotifications(inbox);
            const { data: row } = await fetchLearningProfile(data.user.id);
            if (row) {
              setOnboarded(!!row.onboarded);
              setTiers(tiersFromProfile(row));
              setAge(typeof row.age === "number" ? row.age : null);
            } else {
              setOnboarded(false);
            }
            setProfileHydrated(true);
            setIsAdmin(await checkIsAdmin());
          })();
        }, 0);
      }
      return {};
    } catch (err) {
      return { error: formatAuthError(err instanceof Error ? err.message : "ログインに失敗しました") };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("signOut failed:", err);
    }
    setSupabaseUid(null);
    setSessionEmail(null);
    setIsAdmin(false);
    setAuthenticated(false);
    setOnboarded(false);
    setAge(null);
    setProfileHydrated(true);
    setNotifications([]);
    setSaved(loadLocalSavedMap());
    setFeltVotes({});
    setLastAttempts({});
    setAttemptStarts({});
    setNotifyAuthors([]);
    setRevengeDue([]);
    setCalendarDays([]);
    setLearnStreak({ current: 0, longest: 0 });
    void (async () => {
      const next = await fetchAccessStatus();
      setAccess(next);
      setAccessReady(true);
    })();
  }, []);

  const refreshAccess = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const next = await fetchAccessStatus(session?.access_token);
    setAccess(next);
    setAccessReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshAccess();
  }, [ready, authenticated, supabaseUid, refreshAccess]);

  const toggleFollow = useCallback((userId: string) => {
    if (userId === me.id) return;
    setFollows((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (!prev.includes(userId)) {
        const u = USER_MAP[userId];
        setActivities((a) => [
          {
            id: `act-${Date.now()}`,
            type: "follow",
            userId: me.id,
            text: `${u?.name ?? "ユーザー"} をフォローした`,
            createdAt: new Date().toISOString(),
          },
          ...a,
        ]);
      }
      return next;
    });
  }, [me.id]);

  const toggleLike = useCallback((postId: string) => {
    setLikes((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId],
    );
  }, []);

  const toggleRepost = useCallback((postId: string) => {
    setReposts((prev) => {
      const on = prev.includes(postId);
      if (on) {
        setActivities((a) => a.filter((x) => !(x.type === "repost" && x.postId === postId)));
        return prev.filter((id) => id !== postId);
      }
      setActivities((a) => [
        {
          id: `act-${Date.now()}`,
          type: "repost",
          userId: ME_ID,
          postId,
          text: "がリポストした",
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      return [...prev, postId];
    });
  }, []);

  const rate = useCallback((postId: string, kind: RatingKind, stars: number) => {
    setRatings((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [kind]: stars },
    }));
  }, []);

  const addProblem = useCallback(async (input: NewProblem) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return { error: "投稿するにはログインしてください" };
    }
    const authorId = session.user.id || me.id;
    const hydrated = await persistHandwritingPages(authorId, input.pages, input.drawingBlobs);
    if (hydrated.error) return { error: hydrated.error };
    const pages = hydrated.pages;
    const hadDrawingBlobs = input.drawingBlobs?.some((b) => !!b && b.size > 0) ?? false;
    if (input.format === "handwriting" && hadDrawingBlobs && !firstDrawingUrl(pages)) {
      return { error: HANDWRITING_UPLOAD_ERROR };
    }
    const photo = firstDrawingUrl(pages) ?? (hadDrawingBlobs ? undefined : input.photo);
    const prepared = { ...input, pages, photo, drawingBlobs: undefined };

    if (prepared.isSprint) {
      const mail = await sendPulseProblemMail({
        title: prepared.title ?? "",
        text: prepared.text,
        subject: prepared.subject,
        solution: prepared.solution,
        format: prepared.format,
        photo: prepared.photo || pages?.find((p) => p.image)?.image,
        authorId,
        authorName: me.name,
        authorHandle: me.handle,
      });
      if (mail.error) return { error: mail.error };
      return { pulseSubmitted: true };
    }

    const { post, error } = await insertProblem({
      ...prepared,
      isSprint: false,
      authorId,
    });
    if (error || !post) return { error: error || "投稿に失敗しました" };
    void referralFetch("/api/referral/event", {
      method: "POST",
      body: JSON.stringify({ type: "post" }),
    }).then((res) => {
      if (!res.error && res.data && "code" in res.data) {
        setReferralMe(res.data as unknown as ReferralMe);
      }
    });
    setRemotePosts((p) => [post, ...p.filter((x) => x.id !== post.id)]);
    setRemoteUsers((u) => ({
      ...u,
      [session.user.id]: fallbackUser(session.user.id, {
        id: session.user.id,
        name: displayNameFromUser(session.user),
        handle: handleFromUser(session.user) ?? null,
      }),
    }));
    return {};
  }, [me.id, me.name, me.handle]);

  const updateProblem = useCallback(async (id: string, patch: ProblemPatch) => {
    const { post, error } = await persistProblemUpdate(id, patch);
    if (error || !post) return { error: error || "更新に失敗しました" };
    setRemotePosts((p) => p.map((x) => (x.id === id ? post : x)));
    return {};
  }, []);

  const deleteProblem = useCallback(async (id: string) => {
    if (isProblemUuid(id)) {
      const { error } = await persistDeleteProblem(id);
      if (error) return { error };
      setRemotePosts((p) => p.filter((x) => x.id !== id));
    }
    setExtra((p) => p.filter((x) => x.id !== id));
    return {};
  }, []);

  const promoteProblem = useCallback(async (id: string) => {
    if (isProblemUuid(id)) {
      const { post, error } = await persistPromoteProblem(id);
      if (error || !post) return { error: error || "プロモーションに失敗しました" };
      setRemotePosts((p) => p.map((x) => (x.id === id ? post : x)));
      return {};
    }
    const now = new Date();
    const used = [...remotePosts, ...extra].some((p) => {
      if (p.id === id) return false;
      if (!p.promoted || !p.promotedAt) return false;
      const a = new Date(p.promotedAt);
      return a.getFullYear() === now.getFullYear() && a.getMonth() === now.getMonth();
    });
    if (used) return { error: "今月のプロモーション枠（1回）は使用済みです" };
    const stamp = now.toISOString();
    const apply = (p: Post) =>
      p.id === id ? { ...p, promoted: true, promotedAt: stamp } : p;
    setRemotePosts((p) => p.map(apply));
    setExtra((p) => p.map(apply));
    return {};
  }, [remotePosts, extra]);

  const addSolution = useCallback(
    async (input: {
      subject: Subject;
      text: string;
      pages?: { id: string; latex: string; doodle: number; image?: string; contentWidth?: number; contentHeight?: number }[];
      drawingBlobs?: (Blob | null)[];
      problemId?: string;
      solutionFormat?: "handwriting" | "typed";
      photo?: string;
      solverAnswer?: string;
    }) => {
      if (!input.problemId) return { error: "引用する問題がありません" };
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authorId = session?.user.id ?? supabaseUid ?? ME_ID;
      if (input.drawingBlobs?.some(Boolean) && !session?.user.id) {
        return { error: "投稿するにはログインしてください" };
      }
      const problem = getPost(input.problemId);
      const isChallenge = problem?.problemMode === "challenge";
      const solverAnswer = (input.solverAnswer ?? "").trim();
      if (isChallenge && !solverAnswer) {
        return { error: "答えを入力してください（単位は不要です）" };
      }
      let challengeGrade: Post["challengeGrade"];
      if (isChallenge) {
        const res = await referralFetch("/api/challenge/grade", {
          method: "POST",
          body: JSON.stringify({ problemId: input.problemId, answer: solverAnswer }),
        });
        if (res.error) return { error: res.error };
        if (res.data && res.data.graded === true) {
          challengeGrade = res.data.correct === true ? "correct" : "incorrect";
        }
      }
      const hydrated = await persistHandwritingPages(authorId, input.pages, input.drawingBlobs);
      if (hydrated.error) return { error: hydrated.error };
      const pages = hydrated.pages;
      const hadDrawingBlobs = input.drawingBlobs?.some((b) => !!b && b.size > 0) ?? false;
      if (
        (input.solutionFormat === "handwriting" || hadDrawingBlobs) &&
        hadDrawingBlobs &&
        !firstDrawingUrl(pages)
      ) {
        return { error: HANDWRITING_UPLOAD_ERROR };
      }
      const photo = firstDrawingUrl(pages) ?? (hadDrawingBlobs ? undefined : input.photo);
      const format = input.solutionFormat ?? (pages?.length ? "handwriting" : "typed");
      const post: Post = {
        id: `local-sol-${Date.now()}`,
        authorId,
        kind: "solution",
        subject: input.subject,
        text: input.text,
        photo,
        pages,
        problemId: input.problemId,
        solutionFormat: format,
        solverAnswer: isChallenge ? solverAnswer : undefined,
        challengeGrade,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        ahaSum: 0,
        ahaCount: 0,
        eleganceSum: 0,
        eleganceCount: 0,
      };
      setExtra((p) => [post, ...p]);
      void referralFetch("/api/referral/event", {
        method: "POST",
        body: JSON.stringify({ type: "solve" }),
      }).then((res) => {
        if (!res.error && res.data && "code" in res.data) {
          setReferralMe(res.data as unknown as ReferralMe);
        }
      });
      if (problem && (problem.kind === "sprint" || problem.isSprint)) {
        setSprint((s) => {
          if (!s.startedAt || s.submittedAt) return s;
          return { ...s, submittedAt: Date.now(), timedOut: false };
        });
      }
      setActivities((a) => [
        {
          id: `act-${Date.now()}`,
          type: "solution",
          userId: supabaseUid ?? ME_ID,
          postId: post.id,
          text: "が引用解法を投稿した",
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      if (input.problemId) {
        const startedAt = attemptStarts[input.problemId];
        const last = lastAttempts[input.problemId];
        const isRevenge = Boolean(
          last?.grade === "incorrect" && !last.revengeCompletedAt,
        );
        void submitProblemAttempt({
          problemId: input.problemId,
          grade: challengeGrade ?? (isChallenge ? "ungraded" : "ungraded"),
          solverAnswer: isChallenge ? solverAnswer : undefined,
          startedAt,
          isRevenge,
        }).then(() => {
          setLastAttempts((prev) => ({
            ...prev,
            [input.problemId!]: {
              grade: challengeGrade ?? "ungraded",
              durationSeconds: startedAt
                ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
                : null,
              submittedAt: new Date().toISOString(),
              isRevenge,
              revengeAvailableAt: null,
              revengeCompletedAt: challengeGrade === "correct" ? new Date().toISOString() : null,
            },
          }));
          if (challengeGrade === "correct") {
            setRevengeDue((prev) => prev.filter((r) => r.problemId !== input.problemId));
          }
        });
        void notifyConfusedReactors(input.problemId).then(() => {
          void fetchNotifications().then(setNotifications);
        });
      }
      return {};
    },
    [supabaseUid, getPost, attemptStarts, lastAttempts],
  );

  const addReply = useCallback(async (input: { replyToId: string; text: string }) => {
    const parent =
      extra.find((p) => p.id === input.replyToId) ||
      remotePosts.find((p) => p.id === input.replyToId) ||
      POSTS.find((p) => p.id === input.replyToId) ||
      (input.replyToId.startsWith("sprint-") ? makeOfficialPost(getSprintDayId()) : undefined);
    const localId = `reply-${Date.now()}`;
    const post: Post = {
      id: localId,
      authorId: supabaseUid ?? ME_ID,
      kind: "reply",
      subject: parent?.subject ?? "math",
      text: input.text,
      replyToId: input.replyToId,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      ahaSum: 0,
      ahaCount: 0,
      eleganceSum: 0,
      eleganceCount: 0,
    };
    setExtra((p) => [post, ...p]);
    setActivities((a) => [
      {
        id: `act-${Date.now()}`,
        type: "reply",
        userId: supabaseUid ?? ME_ID,
        postId: input.replyToId,
        text: "がリプライした",
        createdAt: new Date().toISOString(),
      },
      ...a,
    ]);
    if (isProblemUuid(input.replyToId)) {
      const saved = await persistInsertComment({
        postId: input.replyToId,
        text: input.text,
        subject: parent?.subject ?? "math",
      });
      if (saved.error) {
        setExtra((p) => p.filter((x) => x.id !== localId));
        return { error: saved.error };
      }
      if (saved.post) {
        setExtra((p) => p.filter((x) => x.id !== localId));
        setRemotePosts((p) => [saved.post!, ...p.filter((x) => x.id !== saved.post!.id)]);
      }
    }
    return {};
  }, [extra, remotePosts, supabaseUid]);

  const deleteComment = useCallback(async (id: string) => {
    const doomed =
      extra.find((p) => p.id === id) ||
      remotePosts.find((p) => p.id === id) ||
      MOCK_REPLIES.find((p) => p.id === id);
    const fromExtra = extra.some((p) => p.id === id);
    const fromRemote = remotePosts.some((p) => p.id === id);
    setExtra((p) => p.filter((x) => x.id !== id));
    setRemotePosts((p) => p.filter((x) => x.id !== id));
    setHiddenReplyIds((h) => (h.includes(id) ? h : [...h, id]));
    if (isProblemUuid(id)) {
      const { error } = await persistDeleteComment(id);
      if (error) {
        if (fromExtra && doomed) setExtra((p) => [doomed, ...p]);
        if (fromRemote && doomed) setRemotePosts((p) => [doomed, ...p]);
        setHiddenReplyIds((h) => h.filter((x) => x !== id));
        return { error };
      }
    }
    return {};
  }, [extra, remotePosts]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (supabaseUid && (patch.name != null || patch.handle != null)) {
        const nextName = (patch.name ?? profile.name ?? "").toString();
        const nextHandle = (patch.handle ?? profile.handle ?? "").toString();
        const saved = await savePublicProfile(supabaseUid, {
          name: nextName,
          handle: nextHandle,
        });
        if (saved.error) return saved;
        setRemoteUsers((prev) => ({
          ...prev,
          [supabaseUid]: {
            ...(prev[supabaseUid] ?? fallbackUser(supabaseUid)),
            name: nextName || prev[supabaseUid]?.name || "Qraft ユーザー",
            handle: nextHandle || prev[supabaseUid]?.handle || supabaseUid.slice(0, 8),
          },
        }));
      }
      setProfile((p) => ({ ...p, ...patch }));
      return {};
    },
    [supabaseUid, profile.name, profile.handle],
  );

  const searchUsers = useCallback(async (query: string) => {
    const { profiles, error } = await searchProfiles(query);
    if (error) return { error };
    setRemoteUsers((prev) => {
      const next = { ...prev };
      for (const row of profiles) {
        next[row.id] = fallbackUser(row.id, row);
      }
      return next;
    });
    return {};
  }, []);

  const openComposer = useCallback(
    (next: Exclude<Composer, { open: false }>) => {
      if (next.mode === "solution" && !next.quotePostId) return;
      setComposer(next);
      if (next.mode === "solution" && next.quotePostId) {
        void startProblemAttempt(next.quotePostId).then((res) => {
          if (res.startedAt) {
            setAttemptStarts((prev) => ({ ...prev, [next.quotePostId]: res.startedAt! }));
          }
        });
      }
    },
    [],
  );

  const closeComposer = useCallback(() => setComposer(emptyComposer), []);

  const refreshReferral = useCallback(async () => {
    const res = await referralFetch("/api/referral");
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
    }
  }, []);

  const applyReferralCode = useCallback(async (code: string, deviceId?: string) => {
    if (hasReferralAppliedOnDevice()) {
      return { error: "この端末では既に紹介コードが適用されています" };
    }
    const identity = getDeviceIdentity();
    const res = await referralFetch("/api/referral", {
      method: "POST",
      body: JSON.stringify({
        code,
        deviceId: deviceId || identity.deviceId,
        deviceFingerprint: identity.deviceFingerprint,
      }),
    });
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
      markReferralAppliedOnDevice();
    }
    return { error: res.error };
  }, []);

  const recordCampaignTap = useCallback(async (type: "x_follow" | "x_post") => {
    const res = await referralFetch("/api/referral/campaign", {
      method: "POST",
      body: JSON.stringify({ type, ...getDeviceIdentity() }),
    });
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
    }
    return { error: res.error };
  }, []);

  const refreshPremiumStatus = useCallback(async (): Promise<PremiumStatusPayload | null> => {
    if (!supabaseUid) {
      setServerPremium(false);
      setSubscribed(false);
      return null;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setServerPremium(false);
        setSubscribed(false);
        return null;
      }
      const res = await fetch("/api/premium-status", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setServerPremium(false);
        setSubscribed(false);
        return null;
      }
      if (!res.ok) return null;
      const payload = (await res.json()) as PremiumStatusPayload;
      setServerPremium(Boolean(payload.premium));
      setSubscribed(Boolean(payload.subscribed));
      return payload;
    } catch {
      return null;
    }
  }, [supabaseUid]);

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const subscribe = useCallback(() => {
    setPaywallOpen(false);
    setPremiumOpen(false);
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const unsubscribe = useCallback(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const openPremium = useCallback(() => setPremiumOpen(true), []);
  const closePremium = useCallback(() => setPremiumOpen(false), []);
  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);
  const openPaywall = useCallback((reason?: string) => {
    setPaywallReason(reason || `この機能は Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です`);
    setPaywallOpen(true);
  }, []);
  const closePaywall = useCallback(() => setPaywallOpen(false), []);
  const setBgmOn = useCallback((v: boolean) => setBgmOnState(v), []);
  const setAccentColor = useCallback((c: string) => setAccentColorState(c), []);
  const react = useCallback((postId: string, emoji: string) => {
    setReactions((prev) => ({ ...prev, [postId]: prev[postId] === emoji ? "" : emoji }));
  }, []);

  const toggleConfused = useCallback(
    async (postId: string) => {
      const currentlyOn = !!confusedMine[postId];
      const post = getPost(postId);
      const prevCount = post?.confusedCount ?? 0;
      const nextOn = !currentlyOn;
      const nextCount = Math.max(0, prevCount + (nextOn ? 1 : -1));
      setConfusedMine((prev) => ({ ...prev, [postId]: nextOn }));
      setConfusedCounts((prev) => ({ ...prev, [postId]: nextCount }));
      const res = await toggleConfusedReaction(postId, currentlyOn);
      if (res.error) {
        setConfusedMine((prev) => ({ ...prev, [postId]: currentlyOn }));
        setConfusedCounts((prev) => ({ ...prev, [postId]: prevCount }));
        console.warn("toggleConfused:", res.error);
      }
    },
    [confusedMine, getPost],
  );

  const toggleSave = useCallback(async (problemId: string, category: SaveCategory = "later") => {
    const id = saveStateKey(problemId);
    if (saveLocks.current.has(id)) return;
    saveLocks.current.add(id);
    const currently = !!savedRef.current[id];
    const prevCat = savedRef.current[id];
    const wantSaved = !currently;
    pendingSaveIds.current.add(id);
    stickySave.current[id] = wantSaved;
    setSaved((prev) => {
      const next = { ...prev };
      if (wantSaved) next[id] = category;
      else delete next[id];
      if (!isProblemUuid(id)) persistLocalSavedMap(next);
      return next;
    });
    if (!isProblemUuid(id)) {
      pendingSaveIds.current.delete(id);
      saveLocks.current.delete(id);
      return;
    }
    try {
      const res = await toggleSavedProblem(id, wantSaved, category);
      if (res.error) {
        console.error("toggleSave failed:", res.error);
        delete stickySave.current[id];
        setSaved((prev) => {
          const next = { ...prev };
          if (currently && prevCat) next[id] = prevCat;
          else if (currently) next[id] = "later";
          else delete next[id];
          return next;
        });
        return;
      }
      if (typeof res.saved !== "boolean") {
        console.error("toggleSave: missing saved flag", res);
        delete stickySave.current[id];
        setSaved((prev) => {
          const next = { ...prev };
          if (currently && prevCat) next[id] = prevCat;
          else if (currently) next[id] = "later";
          else delete next[id];
          return next;
        });
        return;
      }
      stickySave.current[id] = res.saved;
      setSaved((prev) => {
        const next = { ...prev };
        if (res.saved) next[id] = res.category ?? category;
        else delete next[id];
        return next;
      });
    } finally {
      pendingSaveIds.current.delete(id);
      saveLocks.current.delete(id);
    }
  }, []);

  const setSaveCategory = useCallback(async (problemId: string, category: SaveCategory) => {
    const id = saveStateKey(problemId);
    setSaved((prev) => {
      const next = { ...prev, [id]: category };
      if (!isProblemUuid(id)) persistLocalSavedMap(next);
      return next;
    });
    if (!isProblemUuid(id)) return;
    const res = await persistSaveCategory(id, category);
    if (res.error) console.error("setSaveCategory:", res.error);
  }, []);

  const voteFeltDifficulty = useCallback(async (problemId: string, vote: FeltVote) => {
    const prev = feltVotes[problemId];
    if (prev === vote) return;
    setFeltVotes((p) => ({ ...p, [problemId]: vote }));
    const bump = (posts: Post[]) =>
      posts.map((x) => {
        if (x.id !== problemId) return x;
        let easy = x.feltEasy ?? 0;
        let normal = x.feltNormal ?? 0;
        let hard = x.feltHard ?? 0;
        if (prev === 1) easy = Math.max(0, easy - 1);
        if (prev === 2) normal = Math.max(0, normal - 1);
        if (prev === 3) hard = Math.max(0, hard - 1);
        if (vote === 1) easy += 1;
        if (vote === 2) normal += 1;
        if (vote === 3) hard += 1;
        return { ...x, feltEasy: easy, feltNormal: normal, feltHard: hard };
      });
    setRemotePosts(bump);
    setExtra(bump);
    const res = await upsertFeltVote(problemId, vote);
    if (res.error) {
      setFeltVotes((p) => {
        const next = { ...p };
        if (prev) next[problemId] = prev;
        else delete next[problemId];
        return next;
      });
      const revert = (posts: Post[]) =>
        posts.map((x) => {
          if (x.id !== problemId) return x;
          let easy = x.feltEasy ?? 0;
          let normal = x.feltNormal ?? 0;
          let hard = x.feltHard ?? 0;
          if (vote === 1) easy = Math.max(0, easy - 1);
          if (vote === 2) normal = Math.max(0, normal - 1);
          if (vote === 3) hard = Math.max(0, hard - 1);
          if (prev === 1) easy += 1;
          if (prev === 2) normal += 1;
          if (prev === 3) hard += 1;
          return { ...x, feltEasy: easy, feltNormal: normal, feltHard: hard };
        });
      setRemotePosts(revert);
      setExtra(revert);
    }
  }, [feltVotes]);

  const startAttempt = useCallback(async (problemId: string) => {
    const res = await startProblemAttempt(problemId);
    if (res.startedAt) {
      setAttemptStarts((prev) => ({ ...prev, [problemId]: res.startedAt! }));
    }
  }, []);

  const toggleNotifyAuthor = useCallback(
    async (authorId: string) => {
      const on = notifyAuthors.includes(authorId);
      setNotifyAuthors((prev) =>
        on ? prev.filter((id) => id !== authorId) : [...prev, authorId],
      );
      const res = await toggleAuthorNotify(authorId, on);
      if (res.error) {
        setNotifyAuthors((prev) =>
          on ? [...prev, authorId] : prev.filter((id) => id !== authorId),
        );
      }
    },
    [notifyAuthors],
  );

  const refreshLearn = useCallback(async () => {
    if (!supabaseUid) return;
    const [boot, cards, savedMap] = await Promise.all([
      fetchLearningBootstrap(),
      fetchLearningCardState(remotePosts.map((p) => p.id)),
      fetchMySavedMap(),
    ]);
    setNotifyAuthors(boot.notifyAuthors);
    setRevengeDue(boot.revenge);
    setCalendarDays(boot.calendarDays);
    setLearnStreak({ current: boot.currentStreak, longest: boot.longestStreak });
    if (cards) {
      setFeltVotes(cards.votes);
      setLastAttempts(cards.attempts);
    }
    if (savedMap) {
      setSaved((prev) =>
        overlayPendingSaved(savedMap, prev, pendingSaveIds.current, stickySave.current),
      );
    }
  }, [supabaseUid, remotePosts]);

  const assignToSeries = useCallback(
    async (
      problemId: string,
      seriesId: string | null,
      seriesTitle?: string,
      ord?: number,
    ) => {
      const res = await assignProblemSeries(problemId, seriesId, ord);
      if (res.error) return { error: res.error };
      setRemotePosts((p) =>
        p.map((x) =>
          x.id === problemId
            ? {
                ...x,
                seriesId: seriesId ?? undefined,
                seriesOrd: seriesId ? (ord ?? 0) : undefined,
                seriesTitle: seriesId ? seriesTitle : undefined,
              }
            : x,
        ),
      );
      return {};
    },
    [],
  );

  useEffect(() => {
    if (!supabaseUid) {
      setSaved((prev) => {
        const local = loadLocalSavedMap();
        const next: Record<string, SaveCategory> = { ...local };
        for (const [k, v] of Object.entries(prev)) {
          if (!isProblemUuid(k)) next[k] = v;
        }
        return next;
      });
      return;
    }
    let cancelled = false;
    void fetchMySavedMap().then((map) => {
      if (cancelled || !map) return;
      setSaved((prev) =>
        overlayPendingSaved(map, prev, pendingSaveIds.current, stickySave.current),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [supabaseUid]);

  useEffect(() => {
    if (!supabaseUid) return;
    const ids = remotePosts.map((p) => p.id).filter(isProblemUuid);
    const t = window.setTimeout(() => {
      void fetchLearningCardState(ids).then((s) => {
        if (!s) return;
        setFeltVotes(s.votes);
        setLastAttempts(s.attempts);
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [remotePosts, supabaseUid]);
  const authorVerified = useCallback(
    (userId: string) => {
      const u = userId === me.id ? me : USER_MAP[userId] ?? remoteUsers[userId];
      if (!u) return false;
      if (userId === me.id && hasPremium) return true;
      return userIsVerified(u);
    },
    [me, hasPremium, remoteUsers],
  );

  const startSprint = useCallback(() => {
    setSprint((s) => ({
      ...s,
      startedAt: Date.now(),
      submittedAt: null,
      timedOut: false,
      pages: s.pages.length ? s.pages : [{ id: "page-1", strokes: [], texts: [] }],
    }));
  }, []);

  const submitSprint = useCallback((pages: CanvasPage[]) => {
    setSprint((s) => ({
      ...s,
      pages,
      submittedAt: Date.now(),
      timedOut: false,
    }));
  }, []);

  const timeoutSprint = useCallback(() => {
    setSprint((s) => ({ ...s, timedOut: true }));
  }, []);

  const updateSprintPages = useCallback((pages: CanvasPage[]) => {
    setSprint((s) => ({ ...s, pages }));
  }, []);

  const sprintUnlocked = !!(sprint.submittedAt || sprint.timedOut);

  const refreshNotifications = useCallback(async () => {
    const inbox = await fetchNotifications();
    setNotifications(inbox);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await persistNotificationRead(id);
  }, []);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  const value: Store = {
    ready,
    onboarded,
    profileHydrated,
    authenticated,
    signUpWithEmail,
    signInWithEmail,
    logout,
    authViaSupabase: !!supabaseUid,
    refreshAccess,
    access,
    accessReady,
    me,
    users: [
      me,
      ...Object.values(remoteUsers).filter((u) => u.id !== me.id),
    ],
    posts,
    loungePosts: LOUNGE_POSTS,
    follows,
    followers: INITIAL_FOLLOWERS,
    likes,
    reposts,
    ratings,
    sprint,
    sprintUnlocked,
    composer,
    activities,
    completeOnboarding,
    updateLearningSettings,
    toggleFollow,
    toggleLike,
    toggleRepost,
    rate,
    addProblem,
    updateProblem,
    deleteProblem,
    promoteProblem,
    openFeedback,
    closeFeedback,
    feedbackOpen,
    addSolution,
    addReply,
    deleteComment,
    startSprint,
    submitSprint,
    timeoutSprint,
    updateSprintPages,
    officialPost,
    community,
    updateProfile,
    searchUsers,
    toggleConfused,
    confusedMine,
    saved,
    toggleSave,
    setSaveCategory,
    feltVotes,
    voteFeltDifficulty,
    lastAttempts,
    attemptStarts,
    startAttempt,
    notifyAuthors,
    toggleNotifyAuthor,
    revengeDue,
    learnStreak,
    calendarDays,
    refreshLearn,
    assignToSeries,
    openComposer,
    closeComposer,
    userOf,
    getPost,
    repliesTo,
    isDeveloper,
    hasPremium,
    referralMe,
    referralReady,
    refreshReferral,
    applyReferralCode,
    recordCampaignTap,
    subscribed,
    subscribe,
    unsubscribe,
    refreshPremiumStatus,
    premiumOpen,
    openPremium,
    closePremium,
    paywallOpen,
    paywallReason,
    openPaywall,
    closePaywall,
    bgmOn,
    setBgmOn,
    accentColor,
    setAccentColor,
    react,
    reactions,
    authorVerified,
    notifications,
    unreadNotificationCount,
    refreshNotifications,
    markNotificationRead,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function avgStars(sum: number, count: number) {
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}

export function userById(id: string): User {
  return USER_MAP[id] ?? USER_MAP[ME_ID];
}

export function isImageSrc(value: string) {
  return value.startsWith("data:") || value.startsWith("http");
}
