"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import ChangePasswordCard from "../_components/ChangePasswordCard";
import ChangeEmailCard from "../_components/ChangeEmailCard";
import SessionsCard from "../_components/SessionsCard";
import MyDataCard from "../_components/MyDataCard";
import MailPreferencesCard from "../_components/MailPreferencesCard";

// "My account": where any signed-in customer (buyer, exhibitor or partner) changes their password.
export default function AccountPage() {
  const t = useTranslations("accountPassword");
  const tc = useTranslations("common");
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center px-6">
        <Link href="/login" className="font-semibold text-emerald-700 underline">{tc("redirecting")}</Link>
      </main>
    );
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-3xl px-6 text-white">
          <h1 className="text-3xl font-extrabold">{t("pageTitle")}</h1>
          <p className="mt-1 text-emerald-100">{t("pageSubtitle")}</p>
          <p className="mt-2 text-sm text-emerald-100">{user.email}</p>
        </div>
      </section>
      <section className="bg-cream-50 py-8">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-6">
            <ChangePasswordCard />
            <ChangeEmailCard />
            {user.role === "buyer" && <MailPreferencesCard />}
            <SessionsCard />
            <MyDataCard />
          </div>
        </div>
      </section>
    </div>
  );
}
