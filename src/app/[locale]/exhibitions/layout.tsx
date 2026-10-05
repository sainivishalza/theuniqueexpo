import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.exhibitions");
  return { title: t("title"), description: t("description") };
}

export default function ExhibitionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
