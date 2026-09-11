"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// "visitor" was merged into the "buyer" role/dashboard -- this route stays
// only to forward anyone with an old bookmark or link to the surviving one.
export default function VisitorDashboardRedirect() {
  const t = useTranslations("common");
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/buyer");
  }, [router]);

  return (
    <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
      <p className="text-gray-500">{t("redirecting")}</p>
    </main>
  );
}
