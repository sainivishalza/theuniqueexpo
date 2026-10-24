"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const TABS = [
  { key: "overview", href: "/dashboard/buyer/wallet" },
  { key: "send", href: "/dashboard/buyer/wallet/send" },
  { key: "topup", href: "/dashboard/buyer/wallet/topup" },
  { key: "withdraw", href: "/dashboard/buyer/wallet/withdraw" },
  { key: "expenses", href: "/dashboard/buyer/wallet/expenses" },
  { key: "shop", href: "/dashboard/buyer/wallet/shop" },
  { key: "use", href: "/dashboard/buyer/wallet/use" },
] as const;

// The frame every rewards-wallet page shares: a header, the sections as tabs, and
// a sign-in prompt for anyone who is not signed in as a buyer.
export default function WalletLayout({ title, subtitle, signInNext, children }: { title: string; subtitle?: string; signInNext?: string; children: React.ReactNode }) {
  const t = useTranslations("buyerWallet");
  const pathname = usePathname();
  const { user, loading } = useAuth();

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/dashboard/buyer" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-emerald-200/80">{subtitle}</p>}
        </div>
      </section>

      <section className="py-8 bg-cream-50 min-h-[50vh]">
        <div className="mx-auto max-w-4xl px-6">
          {loading ? (
            <p className="text-center text-gray-500">{t("loading")}</p>
          ) : !user ? (
            <Card shadow="sm" bordered={false} className="p-10 text-center">
              <div className="text-5xl mb-3" aria-hidden="true">🔐</div>
              <h2 className="text-xl font-bold text-heading mb-1">{t("signInTitle")}</h2>
              <p className="text-gray-500 mb-6">{t("signInHint")}</p>
              <Button href={`/login?next=${encodeURIComponent(signInNext || "/dashboard/buyer/wallet")}`} variant="gradientCta" size="wide">{t("signIn")}</Button>
            </Card>
          ) : user.role !== "buyer" ? (
            <Card shadow="sm" bordered={false} className="p-10 text-center">
              <h2 className="text-xl font-bold text-heading mb-1">{t("buyersOnlyTitle")}</h2>
              <p className="text-gray-500">{t("buyersOnlyHint")}</p>
            </Card>
          ) : (
            <>
              <nav aria-label={t("sections")} className="mb-6 -mx-1 flex flex-wrap gap-2">
                {TABS.map((tab) => {
                  const active = pathname === tab.href;
                  return (
                    <Link
                      key={tab.key}
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${
                        active ? "bg-emerald-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-cream-50"
                      }`}
                    >
                      {t(`tabs.${tab.key}`)}
                    </Link>
                  );
                })}
              </nav>
              {children}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
