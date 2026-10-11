import { getLocale } from "next-intl/server";
import { getConferenceHostingContent } from "@/lib/server/conference-hosting-content-repo";
import { translateContent } from "@/lib/server/content-translations";
import ConferenceForumHostingView from "./ConferenceForumHostingView";

// Content is read on the server (and translated for the visitor's language)
// so the page is complete in the initial HTML instead of showing English
// defaults until a client-side fetch finishes.
export default async function Page() {
  const content = translateContent(await getConferenceHostingContent(), await getLocale());
  return <ConferenceForumHostingView content={content} />;
}
