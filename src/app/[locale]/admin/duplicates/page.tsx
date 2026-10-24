"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatDateOnly } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Member { id: number; buyerNumber: string; name: string; email: string; company: string; suspended: boolean; createdAt: string; registrations: number; points: number }
interface Group { reason: "passport" | "phone"; value: string; members: Member[] }
interface Preview { keep: Member; merge: Member; registrationsMoving: number; registrationsClashing: number; tourAndEventRegistrations: number; favorites: number; points: number; pendingMoney: number }

// Buyers who signed up twice (same passport number or phone number), and a careful way to merge one into the other.
export default function AdminDuplicatesPage() {
  const t = useTranslations("adminDuplicates");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [failed, setFailed] = useState(false);
  // For each group (by its key): the account that stays.
  const [keep, setKeep] = useState<Record<string, number>>({});
  const [asking, setAsking] = useState<{ key: string; preview: Preview } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/admin/duplicates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  const keyOf = (g: Group) => `${g.reason}:${g.value}`;

  async function review(g: Group, merge: Member) {
    const keepId = keep[keyOf(g)] ?? g.members[0].id;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/duplicates/preview?keep=${keepId}&merge=${merge.id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(t("errors.invalid")); return; }
      setAsking({ key: keyOf(g), preview: data.preview });
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function doMerge() {
    if (!asking) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/duplicates/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keep: asking.preview.keep.id, merge: asking.preview.merge.id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
        return;
      }
      setMessage(t("merged", { merged: asking.preview.merge.name || asking.preview.merge.email, kept: asking.preview.keep.name || asking.preview.keep.email }));
      setAsking(null);
      load();
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-10">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="py-1 text-sm text-emerald-200 hover:text-white mb-3 inline-block">{t("back")}</Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-emerald-200/80">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-8 bg-cream-50 min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-6 space-y-5">
          <p className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow-sm">{t("howItWorks")}</p>
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {failed && <p role="alert" className="text-red-700">{t("errors.load")}</p>}
          {!groups && !failed && <p className="text-gray-600">{ta("loading")}</p>}
          {groups && groups.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-gray-700 shadow-sm" data-testid="no-duplicates">{t("none")}</p>}
          {groups?.map((g) => {
            const k = keyOf(g);
            const keepId = keep[k] ?? g.members[0].id;
            return (
              <div key={k} className="rounded-2xl bg-white p-5 shadow-sm" data-testid="duplicate-group" data-key={k}>
                <h2 className="font-bold text-heading [overflow-wrap:anywhere]">{g.reason === "passport" ? t("samePassport", { value: g.value }) : t("samePhone", { value: g.value })}</h2>
                <fieldset className="mt-3">
                  <legend className="text-xs text-gray-600">{t("chooseKeep")}</legend>
                  <ul className="mt-2 divide-y divide-gray-100">
                    {g.members.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-3" data-member={m.id}>
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                          <input type="radio" name={`keep-${k}`} checked={keepId === m.id} onChange={() => { setKeep((p) => ({ ...p, [k]: m.id })); setAsking(null); }} className="mt-1 h-4 w-4" aria-label={t("keepThis", { name: m.name || m.email })} />
                          <span className="min-w-0 text-sm">
                            {m.buyerNumber && <span className="block text-xs font-bold tracking-wide text-emerald-700">{m.buyerNumber}</span>}
                            <span className="font-semibold text-heading [overflow-wrap:anywhere]">{m.name || "—"}</span>
                            <span className="block text-gray-600 [overflow-wrap:anywhere]">{m.email}{m.company ? ` · ${m.company}` : ""}</span>
                            <span className="block text-xs text-gray-600">{t("facts", { date: formatDateOnly(m.createdAt.slice(0, 10), locale), registrations: m.registrations, points: m.points.toLocaleString(locale) })}</span>
                          </span>
                        </label>
                        {keepId !== m.id && (
                          <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => review(g, m)}>{t("mergeInto")}</Button>
                        )}
                        {keepId === m.id && <span className="text-xs font-semibold text-emerald-800">{t("willStay")}</span>}
                      </li>
                    ))}
                  </ul>
                </fieldset>
                {asking && asking.key === k && (
                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="group" aria-label={t("confirmTitle")} data-testid="merge-confirm">
                    <p className="font-semibold">{t("confirmTitle", { merged: asking.preview.merge.name || asking.preview.merge.email, kept: asking.preview.keep.name || asking.preview.keep.email })}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>{t("willMove", { moving: asking.preview.registrationsMoving, clash: asking.preview.registrationsClashing })}</li>
                      <li>{t("willMoveOther", { tours: asking.preview.tourAndEventRegistrations, favorites: asking.preview.favorites })}</li>
                      <li>{t("willMovePoints", { points: asking.preview.points.toLocaleString(locale) })}</li>
                      <li>{t("willFill")}</li>
                      <li>{t("willSuspend")}</li>
                      <li>{t("staysBehind")}</li>
                    </ul>
                    {asking.preview.pendingMoney > 0 && <p role="alert" className="mt-2 font-semibold text-red-800">{t("pendingMoney", { count: asking.preview.pendingMoney })}</p>}
                    <p className="mt-2 font-semibold">{t("cannotUndo")}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button type="button" variant="save" size="compact" disabled={busy || asking.preview.pendingMoney > 0} onClick={doMerge}>{busy ? t("merging") : t("yesMerge")}</Button>
                      <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => setAsking(null)}>{t("cancel")}</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
