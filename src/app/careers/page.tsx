import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const content = await getSitePage("careers");
  return <SitePageView content={content} />;
}
