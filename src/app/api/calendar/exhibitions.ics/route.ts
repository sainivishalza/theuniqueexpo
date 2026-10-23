import { buildIcsFeed } from "@/lib/client/ics";
import { listExhibitions } from "@/lib/server/exhibitions-repo";

// A calendar of the exhibitions that can be subscribed to (webcal://theuniqueexpo.com/api/calendar/exhibitions.ics?locale=en).
// Exhibitions that ended more than a week ago are left out. The text is in the language asked for (en, ru or zh).
const SITE_URL = "https://theuniqueexpo.com";
const NAMES: Record<string, string> = { en: "The Unique Expo: exhibitions", ru: "The Unique Expo: выставки", zh: "The Unique Expo：展会" };

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = asked === "ru" || asked === "zh" ? asked : "en";
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const list = (await listExhibitions(locale)).filter((e) => e.endDate && e.endDate >= cutoff);
  const body = buildIcsFeed(
    list.map((e) => ({
      uid: `exhibition-${e.id}`,
      title: e.title,
      start: e.startDate,
      end: e.endDate,
      location: [e.venue, e.city, e.country].filter(Boolean).join(", "),
      description: e.description ? e.description.slice(0, 400) : undefined,
      url: `${SITE_URL}/${locale}/exhibitions/${e.slug}`,
    })),
    NAMES[locale]
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="exhibitions.ics"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=21600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
