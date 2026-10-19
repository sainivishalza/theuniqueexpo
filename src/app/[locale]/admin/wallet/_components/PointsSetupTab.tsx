"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateRange } from "@/lib/date-format";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface Item { id: number; title: string; startDate: string; endDate: string; attendancePoints?: number; pricePoints?: number; price?: string; currency?: string }
interface Setup { exhibitions: Item[]; tours: Item[] }

function Row({ type, item, value, onValue, onSaved }: { type: "exhibition" | "tour"; item: Item; value: string; onValue: (v: string) => void; onSaved: (points: number) => void }) {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const saved = String(type === "exhibition" ? item.attendancePoints ?? 0 : item.pricePoints ?? 0);
  const valid = /^\d{1,8}$/.test(value.trim());
  const changed = value.trim() !== saved;

  async function save() {
    if (!valid) return;
    setBusy(true);
    setMessage("");
    const res = await walletApi("/api/admin/wallet/points-setup", { method: "PUT", body: { type, id: item.id, points: Number(value.trim()) } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    onSaved(Number(value.trim()));
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-heading [overflow-wrap:anywhere]">{item.title}</p>
          <p className="text-xs text-gray-600">
            {formatDateRange(item.startDate, item.endDate, locale)}
            {type === "tour" && item.price ? ` · ${t("pointsSetup.listPrice", { price: `${item.currency || ""} ${item.price}`.trim() })}` : ""}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{type === "exhibition" ? t("pointsSetup.reward") : t("pointsSetup.price")}</label>
            <input id={id} inputMode="numeric" value={value} onChange={(e) => onValue(e.target.value)} className={fieldClasses(!valid, "w-32")} />
          </div>
          <Button type="button" variant="gradientCta" size="compact" disabled={busy || !valid || !changed} onClick={save}>{t("save")}</Button>
        </div>
      </div>
      {message && <p role="alert" className="mt-1 text-sm text-red-700">{message}</p>}
    </li>
  );
}

export default function PointsSetupTab() {
  const t = useTranslations("adminWallet");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    const res = await walletApi<Setup>("/api/admin/wallet/points-setup");
    if (!res.ok) {
      setError(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSetup(res.data);
    const next: Record<string, string> = {};
    for (const e of res.data.exhibitions) next[`exhibition:${e.id}`] = String(e.attendancePoints ?? 0);
    for (const x of res.data.tours) next[`tour:${x.id}`] = String(x.pricePoints ?? 0);
    setValues(next);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!setup) return <p className="text-gray-600">{t("loading")}</p>;
  return (
    <div className="space-y-6">
      <Card shadow="sm" bordered={false} className="p-5">
        <h2 className="text-lg font-bold text-heading">{t("pointsSetup.exhibitionsTitle")}</h2>
        <p className="mb-2 text-sm text-gray-600">{t("pointsSetup.exhibitionsHint")}</p>
        <ul className="divide-y divide-gray-100">
          {setup.exhibitions.map((e) => (
            <Row key={e.id} type="exhibition" item={e} value={values[`exhibition:${e.id}`] ?? "0"} onValue={(v) => setValues((p) => ({ ...p, [`exhibition:${e.id}`]: v }))} onSaved={(points) => setSetup((p) => p && { ...p, exhibitions: p.exhibitions.map((x) => (x.id === e.id ? { ...x, attendancePoints: points } : x)) })} />
          ))}
        </ul>
      </Card>
      <Card shadow="sm" bordered={false} className="p-5">
        <h2 className="text-lg font-bold text-heading">{t("pointsSetup.toursTitle")}</h2>
        <p className="mb-2 text-sm text-gray-600">{t("pointsSetup.toursHint")}</p>
        <ul className="divide-y divide-gray-100">
          {setup.tours.map((x) => (
            <Row key={x.id} type="tour" item={x} value={values[`tour:${x.id}`] ?? "0"} onValue={(v) => setValues((p) => ({ ...p, [`tour:${x.id}`]: v }))} onSaved={(points) => setSetup((p) => p && { ...p, tours: p.tours.map((y) => (y.id === x.id ? { ...y, pricePoints: points } : y)) })} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
