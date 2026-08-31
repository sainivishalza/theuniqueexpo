import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const content = await getSitePage("blog");
  return <SitePageView content={content} />;
}
