"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/client/registration-format";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

interface Meta {
  notes: { id: number; adminId: number | null; adminName: string; body: string; createdAt: string }[];
  tags: string[];
  assignee: { id: number; name: string } | null;
  admins: { id: number; name: string }[];
}

// Only for the team: who looks after this buyer or registration, tags to find it by, and notes about it.
export default function RecordNotes({ type, id }: { type: "buyer" | "registration"; id: number }) {
  const t = useTranslations("adminRecordNotes");
  const locale = useLocale();
  const { user } = useAuth();
  const ids = { who: useId(), tags: useId(), note: useId() };
  const [meta, setMeta] = useState<Meta | null>(null);
  const [tagText, setTagText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apply = useCallback((data: Meta) => {
    setMeta(data);
    setTagText(data.tags.join(", "));
  }, []);

  useEffect(() => {
    let alive = true;
    setMeta(null);
    fetch(`/api/admin/record-meta?type=${type}&id=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && apply(d))
      .catch(() => alive && setError(t("errors.load")));
    return () => { alive = false; };
  }, [type, id, apply, t]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/record-meta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, ...body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : t("errors.failed"));
        return false;
      }
      apply(data);
      setMessage(done);
      return true;
    } catch {
      setError(t("errors.failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(noteId: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/record-meta?type=${type}&id=${id}&note=${noteId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { apply(data); setMessage(t("noteDeleted")); } else setError(t("errors.failed"));
    } catch {
      setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  const field = fieldClasses();
  return (
    <section aria-label={t("title")} data-testid="record-notes" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
      <div>
        <h3 className="font-bold text-heading">{t("title")}</h3>
        <p className="text-xs text-gray-600">{t("private")}</p>
      </div>
      {!meta ? (
        <p className="text-sm text-gray-600">{error || t("loading")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.who} className="mb-1 block text-sm font-medium text-gray-700">{t("assignedTo")}</label>
              <select id={ids.who} value={meta.assignee?.id ?? ""} disabled={busy} onChange={(e) => post({ action: "assign", adminId: e.target.value === "" ? null : Number(e.target.value) }, e.target.value === "" ? t("unassigned") : t("assigned"))} className={field}>
                <option value="">{t("nobody")}</option>
                {meta.admins.map((a) => <option key={a.id} value={a.id}>{a.name}{a.id === user?.id ? ` (${t("you")})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.tags} className="mb-1 block text-sm font-medium text-gray-700">{t("tags")}</label>
              <div className="flex gap-2">
                <input id={ids.tags} value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder={t("tagsPlaceholder")} autoComplete="off" className={field} />
                <Button type="button" variant="secondaryOutline" size="xs" disabled={busy} onClick={() => post({ action: "tags", tags: tagText.split(",") }, t("tagsSaved"))}>{t("saveTags")}</Button>
              </div>
              <p className="mt-1 text-xs text-gray-600">{t("tagsHint")}</p>
            </div>
          </div>
          <div>
            <label htmlFor={ids.note} className="mb-1 block text-sm font-medium text-gray-700">{t("addNote")}</label>
            <textarea id={ids.note} rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={`${field} resize-none`} />
            <Button type="button" variant="save" size="xs" className="mt-2" disabled={busy || !note.trim()} onClick={async () => { if (await post({ action: "note", body: note }, t("noteAdded"))) setNote(""); }}>{t("saveNote")}</Button>
          </div>
          {message && <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {meta.notes.length === 0 ? (
            <p className="text-sm text-gray-600">{t("noNotes")}</p>
          ) : (
            <ul className="space-y-2" aria-label={t("notesList")}>
              {meta.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                  <p className="whitespace-pre-line text-gray-900 [overflow-wrap:anywhere]">{n.body}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-600">
                    <span>{n.adminName || t("unknownAdmin")} · {formatDateTime(n.createdAt, locale)}</span>
                    {n.adminId === user?.id && <button type="button" disabled={busy} onClick={() => removeNote(n.id)} className="font-semibold text-red-700 underline">{t("deleteNote")}</button>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
