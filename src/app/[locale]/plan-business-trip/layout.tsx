import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.planBusinessTrip");
  return { title: t("title"), description: t("description") };
}

export default function PlanBusinessTripLayout({ children }: { children: React.ReactNode }) {
  return children;
}
