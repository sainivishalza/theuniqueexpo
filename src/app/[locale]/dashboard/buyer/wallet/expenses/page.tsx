"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { formatInstantDateTime, localizeDay } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import { EXPENSE_CATEGORIES, newClientKey } from "@/lib/wallet";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";
import WalletLayout from "../_components/WalletLayout";

interface Claim {
  id: number; category: string; title: string; expenseDate: string | null; amountText: string; receiptCount: number; status: string;
  pointsAwarded: number | null; adminNote: string; exhibitionTitle: string; createdAt: string;
}
interface Expo { id: string; title: string }

const TONE: Record<string, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger" };

export default function ExpensesPage() {
  const t = useTranslations("buyerWallet");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { category: useId(), title: useId(), date: useId(), amount: useId(), expo: useId(), note: useId() };
  const [items, setItems] = useState<Claim[] | null>(null);
  const [expos, setExpos] = useState<Expo[]>([]);
  const [category, setCategory] = useState<string>("flight");
  const [title, setTitle] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [amountText, setAmountText] = useState("");
  const [exhibitionId, setExhibitionId] = useState("");
  const [note, setNote] = useState("");
  const [receipts, setReceipts] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const isBuyer = user?.role === "buyer";
  const filled = receipts.filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestKey = useMemo(() => newClientKey(), [category, title, expenseDate, amountText, exhibitionId, note, receipts.join("|").length]);

  const reload = useCallback(async () => {
    const res = await walletApi<{ items: Claim[] }>("/api/wallet/expenses");
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setItems(res.data.items);
  }, [t]);

  useEffect(() => {
    if (!isBuyer) return;
    reload();
    fetch(`/api/exhibitions?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setExpos(data?.exhibitions?.map((e: { id: string; title: string }) => ({ id: e.id, title: e.title })) || []))
      .catch(() => {});
  }, [isBuyer, reload, locale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || filled.length === 0 || busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    const res = await walletApi("/api/wallet/expenses", {
      method: "POST",
      body: { category, title, expenseDate, amountText, note, receipts: filled, exhibitionId: exhibitionId ? Number(exhibitionId) : null, key: requestKey },
    });
    setBusy(false);
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSent(true);
    setTitle("");
    setExpenseDate("");
    setAmountText("");
    setNote("");
    setReceipts([""]);
    reload();
  }

  return (
    <WalletLayout title={t("expenses.title")} subtitle={t("expenses.subtitle")}>
      <div className="space-y-6">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-1">{t("expenses.formTitle")}</h2>
          <p className="text-sm text-gray-600 mb-4">{t("expenses.formHint")}</p>
          {sent && <p role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t("expenses.sent")}</p>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.category} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.category")}</label>
                <select id={ids.category} value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClasses()}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`expenses.categories.${c}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={ids.title} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.what")}</label>
                <input id={ids.title} value={title} maxLength={150} required onChange={(e) => setTitle(e.target.value)} autoComplete="off" className={fieldClasses()} />
              </div>
              <div>
                <label htmlFor={ids.date} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.date")}</label>
                <input id={ids.date} type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={fieldClasses()} />
              </div>
              <div>
                <label htmlFor={ids.amount} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.amount")}</label>
                <input id={ids.amount} value={amountText} maxLength={60} onChange={(e) => setAmountText(e.target.value)} placeholder="USD 640" autoComplete="off" className={fieldClasses()} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={ids.expo} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.exhibition")}</label>
                <select id={ids.expo} value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} className={fieldClasses()}>
                  <option value="">{t("expenses.noExhibition")}</option>
                  {expos.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {receipts.map((value, i) => (
                <UploadField
                  key={i}
                  label={t("expenses.receipt", { n: i + 1 })}
                  value={value}
                  onChange={(v) => setReceipts((prev) => prev.map((x, j) => (j === i ? v : x)))}
                  onError={setError}
                  allowPdf
                  required={i === 0}
                  invalidMessage={t("errors.invalid_input")}
                  removeLabel={t("remove")}
                />
              ))}
              {receipts.length < 3 && (
                <Button type="button" variant="ghost" size="xs" onClick={() => setReceipts((prev) => [...prev, ""])}>+ {t("expenses.addReceipt")}</Button>
              )}
            </div>

            <div>
              <label htmlFor={ids.note} className="block text-sm font-medium text-gray-700 mb-1.5">{t("expenses.note")}</label>
              <textarea id={ids.note} rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={fieldClasses()} />
            </div>
            <Button type="submit" variant="gradientCta" size="blockMd" disabled={busy || !title.trim() || filled.length === 0}>{busy ? t("sending") : t("expenses.submit")}</Button>
          </form>
        </Card>

        <Card shadow="sm" bordered={false} className="p-6">
          <h2 className="text-lg font-bold text-heading mb-4">{t("expenses.history")}</h2>
          {items && items.length === 0 && <p className="text-gray-600">{t("expenses.historyEmpty")}</p>}
          <ul className="divide-y divide-gray-100">
            {items?.map((x) => (
              <li key={x.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-heading [overflow-wrap:anywhere]">{x.title}</p>
                  <p className="text-sm text-gray-600">
                    {t(`expenses.categories.${x.category}`)}
                    {x.amountText ? ` · ${x.amountText}` : ""}
                    {x.expenseDate ? ` · ${localizeDay(x.expenseDate, locale)}` : ""}
                  </p>
                  {x.exhibitionTitle && <p className="text-sm text-gray-600 [overflow-wrap:anywhere]">{x.exhibitionTitle}</p>}
                  {x.adminNote && <p className="text-sm text-gray-700 [overflow-wrap:anywhere]">{x.adminNote}</p>}
                  <p className="text-xs text-gray-600">{formatInstantDateTime(x.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {x.pointsAwarded !== null && <span className="font-bold text-green-700">+{formatNumber(x.pointsAwarded)}</span>}
                  <Badge tone={TONE[x.status] || "gray"} size="status">{t(`status.${x.status}`)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </WalletLayout>
  );
}
