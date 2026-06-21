// Recently-visited page ids, persisted in localStorage (client-only).

const KEY = "notion-clone:recents";
const MAX = 10;

export function getRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(pageId: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [pageId, ...getRecents().filter((id) => id !== pageId)].slice(
      0,
      MAX,
    );
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / serialization errors
  }
}
