import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.confirmEmail");
  // A page reached from an e-mail, never something to find in a search engine.
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
