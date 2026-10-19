"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import OverviewTab from "./_components/OverviewTab";
import TopupsTab from "./_components/TopupsTab";
import WithdrawalsTab from "./_components/WithdrawalsTab";
import ExpensesTab from "./_components/ExpensesTab";
import WalletsTab from "./_components/WalletsTab";
import PurchasesTab from "./_components/PurchasesTab";
import PointsSetupTab from "./_components/PointsSetupTab";
import SettingsTab from "./_components/SettingsTab";

const TABS = ["overview", "topups", "withdrawals", "expenses", "wallets", "purchases", "pointsSetup", "settings"] as const;
type Tab = (typeof TABS)[number];

// The back-office for the buyers' rewards wallets: what is waiting for a decision,
// every wallet with its full statement, and the rules (limits, points per exhibition,
// package prices, how buyers pay us).
export default function AdminWalletPage() {
  const t = useTranslations("adminWallet");
  const ta = useTranslations("adminCommon");
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted && (TABS as readonly string[]).includes(wanted)) setTab(wanted as Tab);
  }, []);

  function choose(next: string) {
    if (!(TABS as readonly string[]).includes(next)) return;
    setTab(next as Tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  if (loading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-600">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors mb-4">{ta("backToAdmin")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-300">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-6">
          <nav aria-label={t("sections")} className="mb-6 flex flex-wrap gap-2">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                aria-current={tab === key ? "page" : undefined}
                onClick={() => choose(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${
                  tab === key ? "bg-emerald-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-cream-50"
                }`}
              >
                {t(`tabs.${key}`)}
              </button>
            ))}
          </nav>
          {tab === "overview" && <OverviewTab onOpen={choose} />}
          {tab === "topups" && <TopupsTab />}
          {tab === "withdrawals" && <WithdrawalsTab />}
          {tab === "expenses" && <ExpensesTab />}
          {tab === "wallets" && <WalletsTab />}
          {tab === "purchases" && <PurchasesTab />}
          {tab === "pointsSetup" && <PointsSetupTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </section>
    </div>
  );
}
