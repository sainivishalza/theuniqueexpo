import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.events");
  return { title: t("title"), description: t("description") };
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
