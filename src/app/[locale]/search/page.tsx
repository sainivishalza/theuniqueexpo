import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SiteSearchView from "./SiteSearchView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("searchPage");
  // Result pages are not worth indexing; the content they point to already is.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default function SearchPage() {
  return <SiteSearchView />;
}
