import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export default async function ApiDocumentationPage() {
  const content = await getSitePage("api-documentation");
  return <SitePageView content={content} />;
}
