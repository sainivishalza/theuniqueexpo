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

interface Tier { name: string; keywords: string; points: string; isDefault: boolean }

// The regions of one exhibition: each has words matched against the buyer's departure city and the points
// it pays. The last row ("everywhere else") catches everyone who matches no region.
function RegionsEditor({ exhibitionId, onClose }: { exhibitionId: number; onClose: () => void }) {
  const t = useTranslations("adminWallet");
  const uid = useId();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    walletApi<{ tiers: { name: string; keywords: string; points: number; isDefault: boolean }[] }>(`/api/admin/wallet/point-tiers?exhibitionId=${exhibitionId}`).then((res) => {
      if (!res.ok) setMessage(t(`errors.${errorKey(res.data.code)}`));
      else setTiers(res.data.tiers.map((x) => ({ ...x, points: String(x.points) })));
    });
  }, [exhibitionId, t]);

  if (!tiers) return <p className={message ? "text-red-700" : "text-gray-600"} role={message ? "alert" : undefined}>{message || t("loading")}</p>;

  const update = (i: number, patch: Partial<Tier>) => { setSaved(false); setTiers((p) => p && p.map((x, j) => (j === i ? { ...x, ...patch } : x))); };
  const hasDefault = tiers.some((x) => x.isDefault);
  const valid = tiers.every((x) => x.name.trim() !== "" && /^\d{1,8}$/.test(x.points.trim()) && (x.isDefault || x.keywords.trim() !== ""));

  async function save() {
    if (!tiers || !valid) return;
    setBusy(true);
    setMessage("");
    const res = await walletApi(`/api/admin/wallet/point-tiers`, { method: "PUT", body: { exhibitionId, tiers: tiers.map((x) => ({ name: x.name.trim(), keywords: x.keywords, points: Number(x.points.trim()), isDefault: x.isDefault })) } });
    setBusy(false);
    if (!res.ok) { setMessage(t(`errors.${errorKey(res.data.code)}`)); return; }
    setSaved(true);
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-cream-50 p-4">
      <p className="text-sm text-gray-700">{t("pointsSetup.regionsHint")}</p>
      {tiers.length === 0 && <p className="text-gray-600">{t("pointsSetup.regionsNone")}</p>}
      <ol className="space-y-4">
        {tiers.map((x, i) => (
          <li key={i} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div>
                <label htmlFor={`${uid}-n${i}`} className="block text-xs font-medium text-gray-700 mb-1">{x.isDefault ? t("pointsSetup.defaultRegion") : t("pointsSetup.regionName")}</label>
                <input id={`${uid}-n${i}`} value={x.name} maxLength={150} onChange={(e) => update(i, { name: e.target.value })} className={fieldClasses(x.name.trim() === "")} />
              </div>
              <div>
                <label htmlFor={`${uid}-p${i}`} className="block text-xs font-medium text-gray-700 mb-1">{t("pointsSetup.reward")}</label>
                <input id={`${uid}-p${i}`} inputMode="numeric" value={x.points} onChange={(e) => update(i, { points: e.target.value })} className={fieldClasses(!/^\d{1,8}$/.test(x.points.trim()))} />
              </div>
            </div>
            {!x.isDefault && (
              <div className="mt-3">
                <label htmlFor={`${uid}-k${i}`} className="block text-xs font-medium text-gray-700 mb-1">{t("pointsSetup.keywords")}</label>
                <textarea id={`${uid}-k${i}`} rows={2} value={x.keywords} maxLength={2000} onChange={(e) => update(i, { keywords: e.target.value })} className={fieldClasses(x.keywords.trim() === "")} />
              </div>
            )}
            <div className="mt-2 flex gap-2">
              {!x.isDefault && i > 0 && <Button type="button" variant="ghost" size="xs" onClick={() => { setSaved(false); setTiers((p) => { if (!p) return p; const c = [...p]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; }); }}>{t("pointsSetup.moveUp")}</Button>}
              <Button type="button" variant="ghostDanger" size="xs" onClick={() => { setSaved(false); setTiers((p) => p && p.filter((_, j) => j !== i)); }}>{t("remove")}</Button>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="dashedAdd" size="compact" onClick={() => { setSaved(false); setTiers((p) => p && [...p.filter((x) => !x.isDefault), { name: "", keywords: "", points: "0", isDefault: false }, ...p.filter((x) => x.isDefault)]); }}>+ {t("pointsSetup.addRegion")}</Button>
        {!hasDefault && <Button type="button" variant="dashedAdd" size="compact" onClick={() => { setSaved(false); setTiers((p) => p && [...p, { name: t("pointsSetup.otherRegions"), keywords: "", points: "0", isDefault: true }]); }}>+ {t("pointsSetup.addDefault")}</Button>}
      </div>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      {saved && <p role="status" className="text-sm text-green-800">{t("settings.saved")}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="gradientCta" size="compact" disabled={busy || !valid} onClick={save}>{t("save")}</Button>
        <Button type="button" variant="ghost" size="compact" onClick={onClose}>{t("close")}</Button>
      </div>
    </div>
  );
}

function Row({ type, item, value, onValue, onSaved }: { type: "exhibition" | "tour"; item: Item; value: string; onValue: (v: string) => void; onSaved: (points: number) => void }) {
  const t = useTranslations("adminWallet");
  const locale = useLocale();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [regions, setRegions] = useState(false);
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
      {type === "exhibition" && (
        regions ? <RegionsEditor exhibitionId={item.id} onClose={() => setRegions(false)} /> : (
          <Button type="button" variant="ghost" size="xs" className="mt-2" onClick={() => setRegions(true)}>{t("pointsSetup.regions")}</Button>
        )
      )}
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
