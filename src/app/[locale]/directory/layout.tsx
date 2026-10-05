import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.directory");
  return { title: t("title"), description: t("description") };
}

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
