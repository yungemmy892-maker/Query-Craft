import type { Group, QueryPreset, HistoryEntry } from '@/types';

const KEYS = {
  THEME:    'qb_theme',
  SCHEMA:   'qb_schema',
  QUERY:    'qb_query',
  PRESETS:  'qb_presets',
  HISTORY:  'qb_history',
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota exceeded – silently ignore */ }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function cookieGet(key: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieSet(key: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const storage = {
  // Theme — localStorage
  getTheme: (): 'dark' | 'light' => (lsGet<string>(KEYS.THEME) as 'dark' | 'light') ?? 'dark',
  setTheme: (t: 'dark' | 'light') => lsSet(KEYS.THEME, t),

  // Active schema — localStorage
  getSchema: (): string | null => lsGet<string>(KEYS.SCHEMA),
  setSchema: (key: string) => lsSet(KEYS.SCHEMA, key),

  // Current query root — cookies (survives hard refresh, works during SSR)
  getQuery: (): Group | null => {
    const raw = cookieGet(KEYS.QUERY);
    if (!raw) return null;
    try { return JSON.parse(raw) as Group; }
    catch { return null; }
  },
  setQuery: (root: Group) => cookieSet(KEYS.QUERY, JSON.stringify(root)),
  clearQuery: () => cookieSet(KEYS.QUERY, '', -1),

  // Presets — localStorage
  getPresets: (): QueryPreset[] => lsGet<QueryPreset[]>(KEYS.PRESETS) ?? [],
  setPresets: (presets: QueryPreset[]) => lsSet(KEYS.PRESETS, presets),

  // History — localStorage (capped at 50)
  getHistory: (): HistoryEntry[] => lsGet<HistoryEntry[]>(KEYS.HISTORY) ?? [],
  pushHistory: (entry: HistoryEntry) => {
    const current = lsGet<HistoryEntry[]>(KEYS.HISTORY) ?? [];
    lsSet(KEYS.HISTORY, [entry, ...current].slice(0, 50));
  },
  clearHistory: () => lsSet(KEYS.HISTORY, []),
};
