import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.tours");
  return { title: t("title"), description: t("description") };
}

export default function ToursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
