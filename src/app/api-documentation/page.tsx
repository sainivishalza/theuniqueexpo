import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function ApiDocumentationPage() {
  const content = await getSitePage("api-documentation");
  return <SitePageView content={content} />;
}
