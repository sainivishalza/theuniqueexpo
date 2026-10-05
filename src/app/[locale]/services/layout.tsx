import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.services");
  // A plain-string title here would stop the root "%s | The Unique Expo"
  // template from reaching the /services/* sub-pages.
  return {
    title: { default: t("title"), template: "%s | The Unique Expo" },
    description: t("description"),
  };
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
