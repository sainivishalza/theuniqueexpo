"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import { errorKey, walletApi } from "@/lib/client/wallet-client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import UploadField from "@/components/wallet/UploadField";

interface Settings {
  transferMax: number; transferDailyMax: number; withdrawMin: number; transfersEnabled: boolean; withdrawalsEnabled: boolean;
  topupInstructions: string; companyAlipayQr: string; companyWechatQr: string; companyBankDetails: string;
}

export default function SettingsTab() {
  const t = useTranslations("adminWallet");
  const ids = { transferMax: useId(), daily: useId(), min: useId(), instructions: useId(), bank: useId(), transfers: useId(), withdrawals: useId() };
  const [form, setForm] = useState<Settings | null>(null);
  const [texts, setTexts] = useState({ transferMax: "", transferDailyMax: "", withdrawMin: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    walletApi<Settings>("/api/admin/wallet/settings").then((res) => {
      if (!res.ok) {
        setMessage(t(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setForm(res.data);
      setTexts({ transferMax: String(res.data.transferMax), transferDailyMax: String(res.data.transferDailyMax), withdrawMin: String(res.data.withdrawMin) });
    });
  }, [t]);

  if (!form) return <p className={message ? "text-red-700" : "text-gray-600"} role={message ? "alert" : undefined}>{message || t("loading")}</p>;

  const num = (s: string) => (/^\d{1,8}$/.test(s.trim()) && Number(s.trim()) >= 1 ? Number(s.trim()) : null);
  const transferMax = num(texts.transferMax);
  const transferDailyMax = num(texts.transferDailyMax);
  const withdrawMin = num(texts.withdrawMin);
  const valid = transferMax !== null && transferDailyMax !== null && withdrawMin !== null && transferMax <= transferDailyMax;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !form) return;
    setBusy(true);
    setMessage("");
    setSaved(false);
    const res = await walletApi("/api/admin/wallet/settings", { method: "PUT", body: { ...form, transferMax, transferDailyMax, withdrawMin } });
    setBusy(false);
    if (!res.ok) {
      setMessage(t(`errors.${errorKey(res.data.code)}`));
      return;
    }
    setSaved(true);
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((p) => (p ? { ...p, [k]: v } : p));

  return (
    <form onSubmit={save} className="space-y-6">
      <Card shadow="sm" bordered={false} className="p-5 space-y-4">
        <h2 className="text-lg font-bold text-heading">{t("settings.limits")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={ids.transferMax} className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings.transferMax")}</label>
            <input id={ids.transferMax} inputMode="numeric" value={texts.transferMax} onChange={(e) => setTexts((p) => ({ ...p, transferMax: e.target.value }))} className={fieldClasses(transferMax === null)} />
          </div>
          <div>
            <label htmlFor={ids.daily} className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings.transferDailyMax")}</label>
            <input id={ids.daily} inputMode="numeric" value={texts.transferDailyMax} onChange={(e) => setTexts((p) => ({ ...p, transferDailyMax: e.target.value }))} className={fieldClasses(transferDailyMax === null || (transferMax !== null && transferMax > transferDailyMax))} />
          </div>
          <div>
            <label htmlFor={ids.min} className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings.withdrawMin")}</label>
            <input id={ids.min} inputMode="numeric" value={texts.withdrawMin} onChange={(e) => setTexts((p) => ({ ...p, withdrawMin: e.target.value }))} className={fieldClasses(withdrawMin === null)} />
          </div>
        </div>
        <p className="text-xs text-gray-600">{t("settings.limitsHint")}</p>
        <div className="flex flex-wrap gap-6">
          <label htmlFor={ids.transfers} className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input id={ids.transfers} type="checkbox" checked={form.transfersEnabled} onChange={(e) => set("transfersEnabled", e.target.checked)} className="h-4 w-4" />
            {t("settings.transfersEnabled")}
          </label>
          <label htmlFor={ids.withdrawals} className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input id={ids.withdrawals} type="checkbox" checked={form.withdrawalsEnabled} onChange={(e) => set("withdrawalsEnabled", e.target.checked)} className="h-4 w-4" />
            {t("settings.withdrawalsEnabled")}
          </label>
        </div>
      </Card>

      <Card shadow="sm" bordered={false} className="p-5 space-y-4">
        <h2 className="text-lg font-bold text-heading">{t("settings.topupTitle")}</h2>
        <p className="text-sm text-gray-600">{t("settings.topupHint")}</p>
        <div>
          <label htmlFor={ids.instructions} className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings.instructions")}</label>
          <textarea id={ids.instructions} rows={4} maxLength={3000} value={form.topupInstructions} onChange={(e) => set("topupInstructions", e.target.value)} className={fieldClasses()} />
        </div>
        <div>
          <label htmlFor={ids.bank} className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings.bankDetails")}</label>
          <textarea id={ids.bank} rows={3} maxLength={1500} value={form.companyBankDetails} onChange={(e) => set("companyBankDetails", e.target.value)} className={fieldClasses()} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <UploadField label={t("settings.alipayQr")} value={form.companyAlipayQr} onChange={(v) => set("companyAlipayQr", v)} onError={setMessage} high invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
          <UploadField label={t("settings.wechatQr")} value={form.companyWechatQr} onChange={(v) => set("companyWechatQr", v)} onError={setMessage} high invalidMessage={t("errors.invalid_input")} removeLabel={t("remove")} />
        </div>
      </Card>

      {message && <p role="alert" className="text-red-700">{message}</p>}
      {saved && <p role="status" className="text-green-800">{t("settings.saved")}</p>}
      <Button type="submit" variant="gradientCta" size="wide" disabled={busy || !valid}>{busy ? t("saving") : t("save")}</Button>
    </form>
  );
}
