// Tiny in-memory cache for rows that are read on every page view but only
// change when an admin saves them (company profile, theme, slideshow). Pages
// are rendered per request, so without this each visit pays 3+ database
// round trips for the same unchanged rows -- slow on a shared host.
//
// The store lives on globalThis so the admin API route (which clears it on
// save) and the page renderer see the same cache even if Next bundles them as
// separate module instances. Other server processes pick up an edit once the
// TTL runs out.

type Entry = { value: unknown; expires: number };
type Store = { entries: Map<string, Entry>; inflight: Map<string, Promise<unknown>> };

const globalStore = globalThis as unknown as { __ttlCache?: Store };
const store: Store = (globalStore.__ttlCache ??= { entries: new Map(), inflight: new Map() });

export function ttlCached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.entries.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

  const pending = store.inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = load()
    .then((value) => {
      store.entries.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => store.inflight.delete(key));
  store.inflight.set(key, p);
  return p;
}

export function clearTtlCache(key: string): void {
  store.entries.delete(key);
  store.inflight.delete(key);
}
