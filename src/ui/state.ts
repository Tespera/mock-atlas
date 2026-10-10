import type { AddressRecord, CountryCode } from '../core/types';
import type { Lang } from './i18n';
import { DEFAULT_THEME, THEMES, type ThemeId } from './themes';

interface Selection {
  region: string;
  subRegion: string;
  variant: string;
}

export interface Settings {
  lang: Lang;
  theme: ThemeId;
  country: CountryCode;
  identity: boolean;
  card: boolean;
  selections: Partial<Record<CountryCode, Selection>>;
}

const SETTINGS_KEY = 'mock-atlas:settings:v1';
const HISTORY_KEY = 'mock-atlas:history:v1';
const HISTORY_LIMIT = 300;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式或配额已满：设置不持久化，不影响使用 */
  }
};

export const settings: Settings = read<Settings>(SETTINGS_KEY, {
  lang: navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
  theme: DEFAULT_THEME,
  country: 'US',
  identity: false,
  card: false,
  selections: {},
});

// 之前版本存下来的风格如果已被移除，回落到默认
if (!THEMES.some((t) => t.id === settings.theme)) settings.theme = DEFAULT_THEME;

export const saveSettings = () => write(SETTINGS_KEY, settings);

export function selectionOf(code: CountryCode): Selection {
  return (settings.selections[code] ??= { region: 'RANDOM', subRegion: '', variant: 'zh' });
}

/* ---------- 历史 ---------- */

let history: AddressRecord[] = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
})();

const listeners = new Set<() => void>();
const commit = () => {
  write(HISTORY_KEY, history);
  listeners.forEach((fn) => fn());
};

export const onHistoryChange = (fn: () => void) => listeners.add(fn);
export const getHistory = (): readonly AddressRecord[] => history;
export const isSaved = (id: string) => history.some((r) => r.id === id);

export function toggleSaved(record: AddressRecord): boolean {
  if (isSaved(record.id)) {
    history = history.filter((r) => r.id !== record.id);
    commit();
    return false;
  }
  history = [record, ...history].slice(0, HISTORY_LIMIT);
  commit();
  return true;
}

export function removeSaved(id: string) {
  history = history.filter((r) => r.id !== id);
  commit();
}

export function clearHistory() {
  history = [];
  commit();
}
