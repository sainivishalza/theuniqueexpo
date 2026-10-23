"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/client/registration-format";
import Button from "@/components/ui/Button";

interface Version { id: number; kind: string; adminName: string; createdAt: string; changed: string[] }

// What was changed on an exhibition, by whom and when, with a button to undo any one change. Pictures are not part of it.
export default function ExhibitionHistory({ exhibitionId, title, onClose, onUndone }: { exhibitionId: string; title: string; onClose: () => void; onUndone: () => void }) {
  const t = useTranslations("adminExhibitionHistory");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const titleId = useId();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/exhibitions/${exhibitionId}/versions`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setVersions(d.versions ?? []))
      .catch(() => alive && setError(t("errors.load")));
    return () => { alive = false; };
  }, [exhibitionId, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function undo(id: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/exhibitions/${exhibitionId}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
        return;
      }
      setVersions(data.versions ?? []);
      setMessage(t("undone"));
      onUndone();
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="text-xl font-bold text-heading [overflow-wrap:anywhere]">{t("title", { name: title })}</h2>
        <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
        {message && <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {versions === null && !error && <p className="mt-4 text-sm text-gray-600">{ta("loading")}</p>}
        {versions && versions.length === 0 && <p className="mt-4 text-sm text-gray-700" data-testid="history-empty">{t("empty")}</p>}
        {versions && versions.length > 0 && (
          <ol className="mt-4 space-y-3" aria-label={t("list")} data-testid="history-list">
            {versions.map((v) => (
              <li key={v.id} data-version={v.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="font-semibold text-heading">{v.kind === "undo" ? t("kindUndo") : t("kindEdit")} · {formatDateTime(v.createdAt, locale)}</p>
                <p className="text-xs text-gray-600">{v.adminName || t("unknownAdmin")}</p>
                <p className="mt-1 text-gray-800">{t("changed")} {v.changed.map((f) => t(`fields.${f}`)).join(", ")}</p>
                {asking === v.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("undoQuestion")}>
                    <span className="text-sm text-gray-800">{t("undoQuestion")}</span>
                    <Button type="button" variant="save" size="xs" disabled={busy} onClick={() => undo(v.id)}>{busy ? t("working") : t("undoYes")}</Button>
                    <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => setAsking(null)}>{t("undoKeep")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="secondaryOutline" size="xs" className="mt-2" onClick={() => setAsking(v.id)}>{t("undo")}</Button>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-5"><Button type="button" variant="secondaryOutline" size="compact" onClick={onClose}>{ta("close")}</Button></div>
      </div>
    </div>
  );
}
