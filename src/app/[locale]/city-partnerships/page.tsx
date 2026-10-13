import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { metaDescription } from "@/lib/seo";
import { getCityPartnershipsContent } from "@/lib/server/city-partnerships-content-repo";
import { translateContent } from "@/lib/server/content-translations";
import CityPartnershipsView from "./CityPartnershipsView";

// Content is read on the server (and translated for the visitor's language)
// so the page is complete in the initial HTML instead of showing English
// defaults until a client-side fetch finishes.
export async function generateMetadata(): Promise<Metadata> {
  const content = translateContent(await getCityPartnershipsContent(), await getLocale());
  return { title: content.title, description: metaDescription(content.subtitle, content.title) };
}

export default async function Page() {
  const content = translateContent(await getCityPartnershipsContent(), await getLocale());
  return <CityPartnershipsView content={content} />;
}
