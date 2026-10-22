"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import ChangePasswordCard from "../../dashboard/_components/ChangePasswordCard";
import TwoStepCard from "./TwoStepCard";

// The admin's own account: change the password they sign in with, and the two-step sign-in.
export default function AdminAccountPage() {
  const t = useTranslations("accountPassword");
  const ta = useTranslations("adminCommon");
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-600">{ta("accessRequired")}</p>
      </div>
    );
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6 text-white">
          <Link href="/admin" className="text-sm text-emerald-100 hover:underline">{ta("backToAdmin")}</Link>
          <h1 className="mt-2 text-3xl font-extrabold">{t("pageTitle")}</h1>
          <p className="mt-1 text-emerald-100">{t("pageSubtitle")}</p>
          <p className="mt-2 text-sm text-emerald-100">{user.email}</p>
        </div>
      </section>
      <section className="bg-cream-50 py-8">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-6">
            <ChangePasswordCard />
            <TwoStepCard />
          </div>
        </div>
      </section>
    </div>
  );
}
