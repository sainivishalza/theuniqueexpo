import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function HelpCenterPage() {
  const content = await getSitePage("help-center");
  return <SitePageView content={content} />;
}
