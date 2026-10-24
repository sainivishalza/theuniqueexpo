"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import Button from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/FormField";

interface Check { blockers: string[]; balance: number; pendingMoney: number; upcomingRegistrations: number }

// "Delete my account": the person sees first what would stop them (points left, money requests waiting) and what deleting does,
// and must give their password and tick that they understand. See src/lib/server/account-deletion.ts for what is removed and kept.
export default function DeleteAccountCard() {
  const t = useTranslations("accountDelete");
  const router = useRouter();
  const ids = { password: useId(), understand: useId() };
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [password, setPassword] = useState("");
  const [understand, setUnderstand] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || check) return;
    fetch("/api/auth/delete-account", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCheck)
      .catch(() => setError(t("failed")));
  }, [open, check, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, understand }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      if (d.code === "blocked") setCheck((c) => (c ? { ...c, blockers: d.blockers ?? c.blockers } : c));
      setError(t.has(d.code) ? t(d.code) : t("failed"));
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="delete-account" className="scroll-mt-24 rounded-2xl border border-red-200 bg-white p-6 shadow-sm" data-testid="delete-account">
      <h2 className="font-bold text-heading">{t("title")}</h2>
      <p className="mt-1 text-sm text-gray-800">{t("intro")}</p>
      <p className="mt-2 text-sm text-gray-700">{t("keepNote")}</p>
      {!open ? (
        <div className="mt-4">
          <Button type="button" variant="secondaryOutline" size="compact" onClick={() => setOpen(true)}>{t("title")}</Button>
        </div>
      ) : !check ? (
        <p className="mt-4 text-sm text-gray-700" role="status">{error || t("checking")}</p>
      ) : check.blockers.length > 0 ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950" data-testid="delete-blockers">
          <p className="font-semibold">{t("blocked")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {check.blockers.map((b) => (
              <li key={b}>{b === "wallet_balance" ? t("wallet_balance", { points: formatNumber(check.balance) }) : b === "pending_money" ? t("pending_money", { count: check.pendingMoney }) : t(b)}</li>
            ))}
          </ul>
          {check.blockers.includes("wallet_balance") && <p className="mt-3"><Link href="/dashboard/buyer/wallet/use" className="py-1 font-semibold text-emerald-900 underline">{t("openWallet")}</Link></p>}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          {check.upcomingRegistrations > 0 && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("upcoming", { count: check.upcomingRegistrations })}</p>}
          <div>
            <label htmlFor={ids.password} className="mb-1 block text-sm font-medium text-gray-800">{t("password")}</label>
            <input id={ids.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClasses()} required />
          </div>
          <div className="flex items-start gap-3">
            <input id={ids.understand} type="checkbox" checked={understand} onChange={(e) => setUnderstand(e.target.checked)} className="mt-1 h-4 w-4" />
            <label htmlFor={ids.understand} className="text-sm text-gray-900">{t("understand")}</label>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !understand || password === ""} className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:opacity-50">{busy ? t("working") : t("button")}</button>
        </form>
      )}
    </div>
  );
}
