"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export interface BulkOption {
  status: string;
  label: string;
}

export const bulkOptions = (statuses: string[], t: (key: string) => string): BulkOption[] => statuses.map((status) => ({ status, label: t(`actions.${status}`) }));

// The bar that appears when registrations are ticked: one button per decision, then a question before anything changes.
// Used for tour and event registrations (exhibitions have their own dialog because approving also sets a confirm-by day).
export default function BulkStatusBar({
  endpoint,
  ids,
  options,
  onApplied,
  onClear,
}: {
  endpoint: string;
  ids: string[];
  options: BulkOption[];
  /** Called with the ids that really changed and the new status. */
  onApplied: (changed: string[], status: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("adminBulkOther");
  const ta = useTranslations("adminCommon");
  const [asking, setAsking] = useState<BulkOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function run(option: BulkOption) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.map(Number), status: option.status }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : ta("somethingWentWrong"));
        return;
      }
      const changed = (data.results ?? []).filter((r: { outcome: string }) => r.outcome === "updated").map((r: { id: number }) => String(r.id));
      onApplied(changed, option.status);
      setNote(t("done", { updated: data.updated ?? 0, unchanged: data.unchanged ?? 0 }));
      setAsking(null);
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  if (ids.length === 0 && !note) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3" data-testid="bulk-bar">
      {ids.length > 0 && <span className="text-sm font-semibold text-emerald-900">{t("selected", { count: ids.length })}</span>}
      {ids.length > 0 && !asking && options.map((o) => (
        <Button key={o.status} type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => setAsking(o)}>{t("apply", { action: o.label })}</Button>
      ))}
      {asking && (
        <span className="flex flex-wrap items-center gap-2" role="group" aria-label={t("question", { action: asking.label, count: ids.length })}>
          <span className="text-sm font-semibold text-emerald-950">{t("question", { action: asking.label, count: ids.length })}</span>
          <Button type="button" variant="save" size="xs" disabled={busy} onClick={() => run(asking)}>{busy ? t("working") : t("yes")}</Button>
          <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => setAsking(null)}>{t("back")}</Button>
        </span>
      )}
      {ids.length > 0 && !asking && <button type="button" onClick={onClear} className="text-xs text-emerald-800 underline">{t("clear")}</button>}
      {note && <span role="status" className="text-sm font-semibold text-emerald-900">{note}</span>}
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
