import { getSitePage } from "@/lib/server/site-pages-repo";
import SitePageView from "@/components/SitePageView";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const content = await getSitePage("contact");
  return <SitePageView content={content} />;
}
