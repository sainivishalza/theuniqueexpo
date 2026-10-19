import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { listTours } from "@/lib/server/tours-repo";
import { listEvents } from "@/lib/server/events-repo";
import { listPublishedPosts } from "@/lib/server/blog-repo";
import { listPublishedIssues } from "@/lib/server/magazine-repo";
import { listVideos } from "@/lib/server/videos-repo";
import { translateContent } from "@/lib/server/content-translations";
import { ttlCached } from "@/lib/server/ttl-cache";
import { matchesQuery, normalizeText } from "@/lib/search";

// Search across everything a visitor can read on the public site. Each kind of content is loaded
// once a minute (it only changes when an admin saves), then matched in memory: whole-word
// matching of every typed word, ignoring capitals and accents, in the visitor's language.

export type SiteSearchKind = "exhibition" | "tour" | "event" | "article" | "magazine" | "video";

export interface SiteSearchResult {
  kind: SiteSearchKind;
  title: string;
  subtitle: string;
  href: string;
}

interface Indexed extends SiteSearchResult {
  text: string;
}

export const KINDS: SiteSearchKind[] = ["exhibition", "tour", "event", "article", "magazine", "video"];
const PER_KIND = 12;
const CACHE_MS = 60_000;

function words(...parts: (string | number | null | undefined | string[])[]): string {
  return normalizeText(
    parts
      .flat()
      .filter((p) => p !== null && p !== undefined && p !== "")
      .join(" ")
  );
}

async function buildIndex(locale: string): Promise<Indexed[]> {
  const [expos, tours, events, posts, issues, videos] = await Promise.all([
    listExhibitions(locale),
    listTours(locale),
    listEvents(),
    listPublishedPosts().then((rows) => translateContent(rows, locale)),
    listPublishedIssues(),
    listVideos(),
  ]);
  const index: Indexed[] = [];
  for (const e of expos) {
    index.push({
      kind: "exhibition", title: e.title, subtitle: [e.dates, e.city, e.industry].filter(Boolean).join(" · "), href: `/exhibitions/${e.slug}`,
      text: words(e.title, e.city, e.country, e.venue, e.industry, e.organizer, e.description, e.highlights),
    });
  }
  for (const t of tours) {
    index.push({
      kind: "tour", title: t.title, subtitle: [t.dates, t.departureCity && t.destination ? `${t.departureCity} → ${t.destination}` : ""].filter(Boolean).join(" · "), href: `/tours/${t.slug}`,
      text: words(t.title, t.destination, t.departureCity, t.description, t.organizer, t.duration),
    });
  }
  for (const ev of events) {
    index.push({
      kind: "event", title: ev.title, subtitle: [ev.eventDate, ev.city].filter(Boolean).join(" · "), href: `/events/${ev.slug}`,
      text: words(ev.title, ev.city, ev.venue, ev.category, ev.description),
    });
  }
  for (const p of posts) {
    index.push({
      kind: "article", title: p.title, subtitle: p.excerpt || "", href: `/blog/${p.slug}`,
      text: words(p.title, p.excerpt, p.category.replace(/-/g, " "), p.authorName),
    });
  }
  for (const m of issues) {
    index.push({
      kind: "magazine", title: m.title, subtitle: `#${m.issueNumber}`, href: `/magazine/${m.issueNumber}`,
      text: words(m.title, m.intro, m.issueNumber),
    });
  }
  for (const v of videos) {
    index.push({
      kind: "video", title: v.title, subtitle: v.category || "", href: "/videos",
      text: words(v.title, v.description, v.category),
    });
  }
  return index;
}

export interface SiteSearchGroup {
  kind: SiteSearchKind;
  total: number;
  items: SiteSearchResult[];
}

export async function siteSearch(query: string, locale: string): Promise<SiteSearchGroup[]> {
  const index = await ttlCached(`site-search:${locale}`, CACHE_MS, () => buildIndex(locale));
  const hits = index.filter((entry) => matchesQuery(entry.text, query));
  return KINDS.map((kind) => {
    const ofKind = hits.filter((h) => h.kind === kind);
    return {
      kind,
      total: ofKind.length,
      items: ofKind.slice(0, PER_KIND).map(({ kind: k, title, subtitle, href }) => ({ kind: k, title, subtitle, href })),
    };
  }).filter((g) => g.total > 0);
}
