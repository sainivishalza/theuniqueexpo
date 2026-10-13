import { ttlCached } from "@/lib/server/ttl-cache";
import { listEvents } from "@/lib/server/events-repo";
import { listPublishedIssues } from "@/lib/server/magazine-repo";
import { listVideos } from "@/lib/server/videos-repo";

export interface NavSections {
  events: boolean;
  magazine: boolean;
  videos: boolean;
}

// Which optional sections have anything to show. The nav/footer only link to
// Events, Magazine and Videos once an admin has published something there, so
// visitors never land on an empty page. On a database error the links stay
// visible (a missing link is worse than an empty page).
export function getNavSections(): Promise<NavSections> {
  return ttlCached("nav-sections", 60_000, async () => {
    const [events, issues, videos] = await Promise.all([
      listEvents().catch(() => null),
      listPublishedIssues().catch(() => null),
      listVideos().catch(() => null),
    ]);
    return {
      events: events === null || events.length > 0,
      magazine: issues === null || issues.length > 0,
      videos: videos === null || videos.length > 0,
    };
  });
}
