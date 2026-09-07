const KEY = "dopa-recent-searches";
const LIMIT = 8;
const EMPTY: string[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: string[] = EMPTY;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Private mode and blocked storage simply mean "no history".
    return null;
  }
}

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return EMPTY;
    return value.filter((item): item is string => typeof item === "string").slice(0, LIMIT);
  } catch {
    return EMPTY;
  }
}

export function subscribeRecentSearches(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cached so repeated renders get a referentially stable array. */
export function getRecentSearches(): string[] {
  const raw = read();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function getServerRecentSearches(): string[] {
  return EMPTY;
}

function write(next: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // History is a convenience; failing to persist it is not an error.
  }
  cachedRaw = JSON.stringify(next);
  cached = next;
  for (const listener of listeners) listener();
}

export function rememberSearch(term: string): void {
  const cleaned = term.trim();
  if (!cleaned) return;
  const current = getRecentSearches();
  write([cleaned, ...current.filter((item) => item !== cleaned)].slice(0, LIMIT));
}

export function clearRecentSearches(): void {
  write(EMPTY);
}
