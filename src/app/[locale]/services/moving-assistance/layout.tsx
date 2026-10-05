import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.servicesMovingAssistance");
  return { title: t("title"), description: t("description") };
}

export default function MovingAssistanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
