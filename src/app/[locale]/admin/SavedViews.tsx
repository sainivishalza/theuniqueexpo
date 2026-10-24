"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface View { id: number; name: string; filters: Record<string, string> }

// Keeps the current filters of a list under a name, and brings them back with one choice. The views are the admin's own
// and follow them to any device. `filters` is whatever the list needs to restore (plain text values); `onApply` puts them back.
export default function SavedViews({
  page,
  filters,
  onApply,
}: {
  page: "buyer-profiles" | "registrations";
  filters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}) {
  const t = useTranslations("adminSavedViews");
  const ids = { pick: useId(), name: useId() };
  const [views, setViews] = useState<View[]>([]);
  const [chosen, setChosen] = useState("");
  const [name, setName] = useState("");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/saved-views?page=${page}`)
      .then((r) => (r.ok ? r.json() : { views: [] }))
      .then((d) => setViews(d.views ?? []))
      .catch(() => {});
  }, [page]);

  function pick(id: string) {
    setChosen(id);
    setAsking(false);
    setNote("");
    const view = views.find((v) => String(v.id) === id);
    if (!view) return;
    setName(view.name);
    onApply(view.filters);
  }

  async function save() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/saved-views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, name, filters }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
        return;
      }
      setViews(data.views ?? []);
      setChosen(String(data.id ?? ""));
      setNote(data.replaced ? t("updated", { name }) : t("saved", { name }));
    } catch {
      setNote(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/saved-views?page=${page}&id=${encodeURIComponent(chosen)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setViews(data.views ?? []);
        setChosen("");
        setNote(t("deleted"));
      } else setNote(t("errors.failed"));
    } catch {
      setNote(t("errors.failed"));
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <div data-testid="saved-views">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="py-1 text-sm font-semibold text-emerald-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 rounded-sm">
        {t("toggle", { count: views.length })}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={ids.pick} className="mb-1 block text-sm font-medium text-gray-700">{t("pick")}</label>
              <select id={ids.pick} value={chosen} onChange={(e) => pick(e.target.value)} disabled={views.length === 0} className={`${fieldClasses()} sm:min-w-56`}>
                <option value="">{views.length === 0 ? t("none") : t("choose")}</option>
                {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {chosen && !asking && <Button type="button" variant="ghostDanger" size="xs" onClick={() => setAsking(true)}>{t("delete")}</Button>}
            {chosen && asking && (
              <span className="flex flex-wrap items-center gap-2" role="group" aria-label={t("deleteQuestion")}>
                <span className="text-sm text-gray-700">{t("deleteQuestion")}</span>
                <Button type="button" variant="ghostDanger" size="xs" disabled={busy} onClick={remove}>{t("deleteYes")}</Button>
                <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setAsking(false)}>{t("deleteKeep")}</Button>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={ids.name} className="mb-1 block text-sm font-medium text-gray-700">{t("saveAs")}</label>
              <input id={ids.name} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="off" className={`${fieldClasses()} sm:min-w-56`} />
            </div>
            <Button type="button" variant="secondaryOutline" size="xs" disabled={busy || !name.trim()} onClick={save}>{t("save")}</Button>
          </div>
          <p className="text-xs text-gray-600">{t("hint")}</p>
          {note && <p role="status" className="text-sm font-semibold text-emerald-800">{note}</p>}
        </div>
      )}
    </div>
  );
}
