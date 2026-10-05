export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "cookie-consent";
// Ask again after 6 months, in line with regulators' guidance not to treat a
// one-off choice as permanent.
const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export const OPEN_COOKIE_SETTINGS_EVENT = "cookie-consent:open";

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: unknown; ts?: unknown };
    if (parsed.choice !== "granted" && parsed.choice !== "denied") return null;
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > CONSENT_TTL_MS) return null;
    return parsed.choice;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, ts: Date.now() }));
  } catch {
    // Storage blocked (private mode etc.): the choice just lasts this page view.
  }
}

// Google sets _ga / _ga_<id> on the registrable domain, so each parent-domain
// variant has to be expired explicitly for the cookie to actually go away.
export function clearAnalyticsCookies(): void {
  const hostParts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < hostParts.length - 1; i++) domains.push(`; domain=.${hostParts.slice(i).join(".")}`);
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0].trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
