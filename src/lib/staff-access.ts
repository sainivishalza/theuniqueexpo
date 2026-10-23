// Staff roles: an admin account can be limited to part of the back office. Accounts with no role set (all existing admins)
// have full access. The rules live in this one file: the server checks them for every /api/admin/ request (in requireAdmin),
// and the admin menu uses the same rules to show only what the person can open.
//
// Anything not listed for a role is refused (deny by default), so a new admin screen is full-access-only until it is
// listed here on purpose.

export const STAFF_PRESETS = ["full", "reviewer", "content", "finance", "viewer"] as const;
export type StaffPreset = (typeof STAFF_PRESETS)[number];

export function isStaffPreset(value: unknown): value is StaffPreset {
  return typeof value === "string" && (STAFF_PRESETS as readonly string[]).includes(value);
}

interface Rule {
  /** First path segment after /api/admin/ that may be read (GET). */
  read: string[];
  /** ...and changed (POST / PUT / PATCH / DELETE). */
  write: string[];
  /** Admin pages (path after the language) that can be opened. */
  pages: string[];
}

// Used by every role: the person's own security settings, and the tools that only keep personal preferences.
const EVERYONE: Rule = { read: ["two-step", "saved-views", "stats", "attention", "sign-ins"], write: ["two-step", "saved-views"], pages: ["/admin", "/admin/account"] };

const REGISTRATION_AREAS = ["expo-registrations", "tour-registrations", "event-registrations"];
const BUYER_AREAS = ["buyer-profiles", "buyers", "buyer-expos", "buyer-form"];
const CONTENT_AREAS = ["exhibitions", "tours", "events", "blog", "magazine", "videos", "faq", "pages", "about", "slideshow-photos", "photo-organizer", "hotels", "hotel-bookings", "china-travel-content", "team-members", "company-profile", "site-theme", "city-partnerships-content", "conference-hosting-content"];

const RULES: Record<Exclude<StaffPreset, "full">, Rule> = {
  // Looks after registrations and buyers: approves, checks documents, announces, checks tickets at the door.
  reviewer: {
    read: [...REGISTRATION_AREAS, ...BUYER_AREAS, "exhibitions", "tours", "events", "record-meta", "tickets", "insights", "email-bounces", "announcement-templates", "visa-applications", "tour-applications", "business-trip-inquiries"],
    write: [...REGISTRATION_AREAS, "buyer-profiles", "buyers", "record-meta", "tickets", "announcement-templates", "visa-applications", "tour-applications", "business-trip-inquiries"],
    pages: ["/admin/registrations", "/admin/buyer-profiles", "/admin/buyer-expos", "/admin/ticket-check", "/admin/insights", "/admin/exhibitions", "/admin/tours", "/admin/events", "/admin/visa-applications", "/admin/tour-applications", "/admin/business-trip-inquiries", "/admin/buyer-form"],
  },
  // Writes the website: exhibitions, tours, events, articles, pages, pictures.
  content: {
    read: [...CONTENT_AREAS, "insights"],
    write: [...CONTENT_AREAS],
    pages: ["/admin/exhibitions", "/admin/tours", "/admin/events", "/admin/blog", "/admin/magazine", "/admin/videos", "/admin/faq", "/admin/pages", "/admin/about", "/admin/team", "/admin/company-profile", "/admin/site-theme", "/admin/slideshow", "/admin/photo-organizer", "/admin/hotels", "/admin/china-travel", "/admin/city-partnerships-content", "/admin/services", "/admin/insights"],
  },
  // Looks after the rewards wallet and the money reports.
  finance: {
    read: ["wallet", "insights", "scheduled-exports", "expo-registrations"],
    write: ["wallet", "scheduled-exports"],
    pages: ["/admin/wallet", "/admin/insights", "/admin/scheduled-exports", "/admin/registrations"],
  },
  // Can look at registrations and the reports but change nothing.
  viewer: {
    read: [...REGISTRATION_AREAS, "exhibitions", "tours", "events", "insights"],
    write: [],
    pages: ["/admin/registrations", "/admin/insights", "/admin/exhibitions", "/admin/tours", "/admin/events"],
  },
};

const READ_METHODS = new Set(["GET", "HEAD"]);

function segmentAfter(pathname: string, base: string): string {
  return pathname.startsWith(base) ? pathname.slice(base.length).split("/")[0] : "";
}

/** May this role make this request to the admin API? (`pathname` is the URL path, e.g. /api/admin/wallet/topups.) */
export function canCallAdminApi(preset: StaffPreset, method: string, pathname: string): boolean {
  if (preset === "full") return true;
  const area = segmentAfter(pathname, "/api/admin/");
  if (!area) return false;
  const rule = RULES[preset];
  const write = !READ_METHODS.has(method.toUpperCase());
  const lists = write ? [rule.write, EVERYONE.write] : [rule.read, EVERYONE.read];
  return lists.some((l) => l.includes(area));
}

/** May this role open this admin page? (`pathname` without the language, e.g. /admin/wallet.) */
export function canOpenAdminPage(preset: StaffPreset, pathname: string): boolean {
  if (preset === "full") return true;
  const clean = pathname.replace(/\/+$/, "") || "/";
  const pages = [...RULES[preset].pages, ...EVERYONE.pages];
  return pages.some((p) => (p === "/admin" ? clean === "/admin" : clean === p || clean.startsWith(`${p}/`)));
}

/** Only full access manages other staff, merges accounts, changes e-mail or user settings. */
export const FULL_ONLY_NOTE = "Anything not listed for a role needs full access.";
