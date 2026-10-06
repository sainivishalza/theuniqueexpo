import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getVisaServiceById } from "@/lib/visa-setup";
import VisaApplyForm from "./VisaApplyForm";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ service?: string }> }): Promise<Metadata> {
  const { service } = await searchParams;
  const svc = service ? getVisaServiceById(service) : undefined;
  const t = await getTranslations("visaApplyPage");
  return { title: svc ? t("title", { name: svc.title }) : t("unknownService") };
}

// The "Get Started" buttons on /services/visa-setup link here with ?service=<id>.
export default async function VisaApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const svc = service ? getVisaServiceById(service) : undefined;
  return <VisaApplyForm service={svc ? { id: svc.id, type: svc.type, title: svc.title } : null} />;
}
