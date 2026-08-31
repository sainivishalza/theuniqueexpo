import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function BoothSetupTipsPage() {
  const content = await getSitePage("booth-setup-tips");
  return <SitePageView content={content} />;
}
