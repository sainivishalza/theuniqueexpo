import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function ExhibitionGuidePage() {
  const content = await getSitePage("exhibition-guide");
  return <SitePageView content={content} />;
}
