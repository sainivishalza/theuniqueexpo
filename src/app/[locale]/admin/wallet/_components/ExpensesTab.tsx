"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime, localizeDay } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, pointsFromText, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ImageViewer, ListFilters, PersonLine, ShowMore, StatusBadge, useAdminList, useDebounced, type Person } from "./shared";

interface Claim extends Person {
  id: number; category: string; title: string; expenseDate: string | null; amountText: string; note: string; receiptCount: number; status: string;
  pointsAwarded: number | null; adminNote: string; exhibitionTitle: string; createdAt: string;
}

export default function ExpensesTab() {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const ids = { points: useId(), note: useId() };
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  const { items, hasMore, loading, error, reload, loadMore } = useAdminList<Claim>("/api/admin/wallet/expenses", { status, q: search });
  const [openId, setOpenId] = useState<number | null>(null);
  const [receipts, setReceipts] = useState<Record<number, string[]>>({});
  const [pointsText, setPointsText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function open(row: Claim) {
    setMessage("");
    setOpenId(row.id);
    setPointsText("");
    setNote("");
    if (!receipts[row.id]) {
      const res = await walletApi<{ receipts: string[] }>(`/api/admin/wallet/expenses/${row.id}`);
      if (res.ok) setReceipts((p) => ({ ...p, [row.id]: res.data.receipts }));
      else setMessage(t(`errors.${errorKey(res.data.code)}`));
    }
  }

  async function decide(row: Claim, action: "approve" | "reject") {
    const points = pointsFromText(pointsText);
    if (action === "approve" && points === null) {
      setMessage(t("errors.invalid_amount"));
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/expenses/${row.id}`, { method: "PATCH", body: { action, points, note } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      if (res.data.code === "already_processed") reload();
      return;
    }
    setOpenId(null);
    reload();
  }

  return (
    <div>
      <ListFilters statuses={["pending", "approved", "rejected"]} status={status} onStatus={setStatus} q={q} onQ={setQ} statusLabel={(s) => t(`status.${s}`)} />
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {!loading && items.length === 0 && !error && <p className="text-gray-600">{t("expenses.empty")}</p>}
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id}>
            <Card shadow="sm" bordered={false} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PersonLine person={row} />
                <div className="text-right">
                  {row.pointsAwarded !== null && <p className="text-xl font-extrabold text-green-700">+{formatNumber(row.pointsAwarded)}</p>}
                  <StatusBadge status={row.status} label={t(`status.${row.status}`)} />
                </div>
              </div>
              <p className="mt-2 font-semibold text-heading [overflow-wrap:anywhere]">{row.title}</p>
              <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">
                {t(`expenses.categories.${row.category}`)}
                {row.amountText ? ` · ${row.amountText}` : ""}
                {row.expenseDate ? ` · ${localizeDay(row.expenseDate, locale)}` : ""}
                {row.exhibitionTitle ? ` · ${row.exhibitionTitle}` : ""}
              </p>
              {row.note && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{row.note}</p>}
              {row.adminNote && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{t("adminNote")}: {row.adminNote}</p>}
              <p className="text-xs text-gray-600">{t("expenses.receiptCount", { count: row.receiptCount })} · {formatInstantDateTime(row.createdAt, locale)}</p>
              <div className="mt-3">
                {openId === row.id ? (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-cream-50 p-4">
                    {receipts[row.id] ? (
                      <div className="flex flex-wrap gap-3">
                        {receipts[row.id].map((src, i) => <ImageViewer key={i} src={src} alt={t("expenses.receiptAlt", { n: i + 1 })} />)}
                      </div>
                    ) : (
                      <p className="text-gray-600">{t("loading")}</p>
                    )}
                    {row.status === "pending" && (
                      <>
                        <div>
                          <label htmlFor={ids.points} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.awardPoints")}</label>
                          <input id={ids.points} inputMode="numeric" value={pointsText} onChange={(e) => setPointsText(e.target.value)} className={fieldClasses()} />
                          <p className="mt-1 text-xs text-gray-600">{t("expenses.awardHint")}</p>
                        </div>
                        <div>
                          <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("noteToBuyer")}</label>
                          <input id={ids.note} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={fieldClasses()} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant="gradientCta" size="compact" disabled={busy} onClick={() => decide(row, "approve")}>{t("expenses.approve")}</Button>
                          <Button type="button" variant="ghostDanger" size="compact" disabled={busy} onClick={() => decide(row, "reject")}>{t("reject")}</Button>
                        </div>
                      </>
                    )}
                    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
                    <Button type="button" variant="ghost" size="xs" onClick={() => setOpenId(null)}>{t("close")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="xs" onClick={() => open(row)}>{row.status === "pending" ? t("review") : t("details")}</Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <ShowMore hasMore={hasMore} loading={loading} onMore={loadMore} />
    </div>
  );
}
