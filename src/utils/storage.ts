const STORAGE_PREFIX = 'trackug_v1_';

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (e) {
    console.warn(`[TrackUG] Failed to load ${key} from localStorage, using fallback:`, e);
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`[TrackUG] Failed to persist ${key} to localStorage:`, e);
  }
}

export function clearAllStoredData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[TrackUG] Failed to clear storage:', e);
  }
}
