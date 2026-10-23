import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UnsubscribeForm from "./UnsubscribeForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("unsubscribePage");
  // A personal link from an e-mail: never offered by search engines.
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; k?: string; t?: string }> }) {
  const { u, k, t } = await searchParams;
  return <UnsubscribeForm u={String(u ?? "")} k={String(k ?? "")} token={String(t ?? "")} />;
}
