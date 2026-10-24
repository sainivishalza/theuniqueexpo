"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateOnly, STATUS_TONE } from "@/lib/client/registration-format";
import type { MyRegistration } from "@/lib/registration-lifecycle";
import DocumentWarnings from "@/components/DocumentWarnings";
import NextEditionOffer from "@/components/NextEditionOffer";
import RegistrationTimeline from "@/components/RegistrationTimeline";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BulkRegister from "../../_components/BulkRegister";
import CancelManyDialog from "../../_components/CancelManyDialog";

// Every exhibition this buyer has registered for, with where each one stands and the
// next step. The steps themselves (confirm, check in, feedback) are done on the
// exhibition page, so each row links there.
export default function BuyerRegistrationsPage() {
  const t = useTranslations("buyerDashboard.registrations");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MyRegistration[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Registrations ticked for "cancel several".
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState(false);

  const loadMine = useCallback(() => {
    fetch(`/api/expo-registrations/mine?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.registrations || []);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [locale]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadMine();
  }, [authLoading, user, loadMine]);

  // The ones that can still be cancelled; the ticks only appear when there are at least two (a single one is cancelled on its exhibition page).
  const cancellable = (items ?? []).filter((r) => r.actions.cancel);
  const canTick = cancellable.length >= 2;
  const chosen = cancellable.filter((r) => ticked.has(r.id));
  function toggleTick(id: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function nextStep(r: MyRegistration): string {
    if (r.actions.confirm) return r.confirmBy ? t("hints.confirmBy", { date: formatDateOnly(r.confirmBy, locale) }) : t("hints.approved");
    if (r.actions.feedback) return t("hints.feedback");
    if (r.status === "confirmed") return t("hints.confirmed");
    return "";
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/dashboard/buyer" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50 min-h-[40vh]">
        <div className="mx-auto max-w-4xl px-6 space-y-4">
          {user?.role === "buyer" && <BulkRegister onChanged={loadMine} />}
          <h2 className="pt-4 text-2xl font-extrabold text-heading">{t("yourRegistrations")}</h2>
          {failed && <p role="alert" className="text-center text-red-600">{t("loadFailed")}</p>}
          {!failed && items === null && <p className="text-center text-gray-500">{t("loading")}</p>}
          {items && items.length === 0 && (
            <Card shadow="sm" bordered={false} className="p-10 text-center">
              <div className="text-5xl mb-3" aria-hidden="true">🎫</div>
              <h2 className="text-xl font-bold text-heading mb-1">{t("emptyTitle")}</h2>
              <p className="text-gray-500 mb-6">{t("emptyHint")}</p>
              <Button href="/exhibitions" variant="gradientCta" size="wide">{t("browse")}</Button>
            </Card>
          )}
          {canTick && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-700">{chosen.length === 0 ? t("cancelMany.hint") : t("cancelMany.selectedCount", { count: chosen.length })}</p>
              {chosen.length > 0 && (
                <div className="ml-auto flex gap-3">
                  <Button type="button" variant="ghostDanger" size="xs" onClick={() => setCancelling(true)}>{t("cancelMany.cancelSelected", { count: chosen.length })}</Button>
                  <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setTicked(new Set())}>{t("cancelMany.clear")}</Button>
                </div>
              )}
            </div>
          )}
          {items?.map((r) => {
            const hint = nextStep(r);
            return (
              <Card key={r.id} shadow="sm" bordered={false} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {canTick && r.actions.cancel && (
                    <input type="checkbox" checked={ticked.has(r.id)} onChange={() => toggleTick(r.id)} className="mt-1 h-5 w-5 shrink-0 rounded border-gray-400 accent-emerald-700" aria-label={t("cancelMany.select", { title: r.exhibitionTitle })} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-heading [overflow-wrap:anywhere]">{r.exhibitionTitle}</h2>
                    <p className="text-sm text-gray-500">
                      {formatDateOnly(r.exhibitionStart, locale)}
                      {r.exhibitionEnd && r.exhibitionEnd !== r.exhibitionStart ? ` – ${formatDateOnly(r.exhibitionEnd, locale)}` : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] || "gray"} size="status">{t(`statusLabels.${r.status}`)}</Badge>
                </div>
                {hint && <p className="mt-3 text-sm font-semibold text-emerald-900">{hint}</p>}
                {r.status === "pending" && r.waitlisted && <p className="mt-3 text-sm font-semibold text-gold-800">{t("waitlisted")}</p>}
                <DocumentWarnings registration={r} />
                <NextEditionOffer registration={r} />
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm font-semibold text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">{t("showProgress")}</summary>
                  <RegistrationTimeline registration={r} className="mt-3" />
                </details>
                <div className="mt-4">
                  <Link
                    href={`/exhibitions/${r.exhibitionSlug}`}
                    className="text-sm font-semibold text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm"
                  >
                    {t("manage")}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
      {cancelling && (
        <CancelManyDialog
          items={chosen.map((r) => ({ id: r.id, title: r.exhibitionTitle }))}
          onClose={(done) => { setCancelling(false); if (done) setTicked(new Set()); }}
          onDone={loadMine}
        />
      )}
    </div>
  );
}
