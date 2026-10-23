"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { fieldClasses } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";
import { ANNOUNCEMENT_FIELDS, fillFields, unknownFields, usesFields, type FieldValues } from "@/lib/announcement-fields";

const LANGS = ["en", "ru", "zh"] as const;
type Lang = (typeof LANGS)[number];
type Langs = Record<Lang, string>;
interface Template { id: number; name: string; subject: Langs; message: Langs }

// Writes one announcement for the selected buyers: it appears under Notifications on the website for all of
// them and, when e-mail is on, is also e-mailed to those with a real address, each in their own language:
// English is required, Russian and Chinese are optional (buyers using those languages get them when
// written, otherwise English).
export default function AnnounceDialog({
  userIds,
  withEmail,
  onClose,
}: {
  userIds: number[];
  /** How many of the selected buyers have a real e-mail address. */
  withEmail: number;
  onClose: () => void;
}) {
  const t = useTranslations("adminBuyerProfiles.announce");
  const ta = useTranslations("adminCommon");
  const ids = { title: useId(), subject: useId(), message: useId(), load: useId(), name: useId() };
  const [lang, setLang] = useState<Lang>("en");
  const [subject, setSubject] = useState<Record<Lang, string>>({ en: "", ru: "", zh: "" });
  const [message, setMessage] = useState<Record<Lang, string>>({ en: "", ru: "", zh: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ queued: number; withoutEmail: number; notified: number; mailOn: boolean } | null>(null);
  // Whether the site can send e-mail at all (the sign-in page asks the same question).
  const [mailOn, setMailOn] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Saved texts, and the values the first selected buyer would get for the fields (for the preview).
  const [templates, setTemplates] = useState<Template[]>([]);
  const [chosen, setChosen] = useState("");
  const [saveName, setSaveName] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [templateNote, setTemplateNote] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [sample, setSample] = useState<Record<Lang, FieldValues> | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const ready = subject.en.trim().length >= 3 && message.en.trim().length >= 5 && userIds.length > 0 && !busy && !result;

  useEffect(() => {
    fetch("/api/auth/forgot-password")
      .then((r) => r.json())
      .then((d) => setMailOn(!!d.enabled))
      .catch(() => setMailOn(null));
  }, []);

  useEffect(() => {
    fetch("/api/admin/announcement-templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
    fetch("/api/admin/buyer-profiles/announce/sample", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSample(d?.values ?? null))
      .catch(() => {});
    // Only the first selected buyer is used, so this runs once per dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  // Puts a field such as {name} into the message where the cursor is.
  function insertField(field: string) {
    const el = messageRef.current;
    const token = `{${field}}`;
    const start = el?.selectionStart ?? message[lang].length;
    const end = el?.selectionEnd ?? start;
    const next = message[lang].slice(0, start) + token + message[lang].slice(end);
    setMessage((m) => ({ ...m, [lang]: next }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function loadTemplate(id: string) {
    setChosen(id);
    setAskDelete(false);
    setTemplateNote("");
    const tpl = templates.find((x) => String(x.id) === id);
    if (!tpl) return;
    setSubject(tpl.subject);
    setMessage(tpl.message);
    setSaveName(tpl.name);
  }

  async function saveTemplate() {
    setTemplateBusy(true);
    setTemplateNote("");
    try {
      const res = await fetch("/api/admin/announcement-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: saveName, subject, message }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateNote(t.has(`templates.errors.${data.code}`) ? t(`templates.errors.${data.code}`) : t("templates.errors.failed"));
        return;
      }
      setTemplates(data.templates ?? []);
      setChosen(String(data.id));
      setTemplateNote(data.replaced ? t("templates.replaced", { name: saveName }) : t("templates.saved", { name: saveName }));
    } catch {
      setTemplateNote(t("templates.errors.failed"));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function removeTemplate() {
    setTemplateBusy(true);
    try {
      const res = await fetch(`/api/admin/announcement-templates?id=${encodeURIComponent(chosen)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTemplates(data.templates ?? []);
        setChosen("");
        setTemplateNote(t("templates.deleted"));
      } else setTemplateNote(t("templates.errors.failed"));
    } catch {
      setTemplateNote(t("templates.errors.failed"));
    } finally {
      setTemplateBusy(false);
      setAskDelete(false);
    }
  }

  const typed = LANGS.flatMap((l) => [subject[l], message[l]]).join("\n");
  const unknown = unknownFields(typed);
  const showPreview = !!sample && usesFields(`${subject[lang]}\n${message[lang]}`);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/buyer-profiles/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(t.has(`errors.${data.code}`) ? t(`errors.${data.code}`) : ta("somethingWentWrong"));
        setConfirming(false);
        return;
      }
      setResult({ queued: data.queued, withoutEmail: data.withoutEmail, notified: data.notified ?? 0, mailOn: data.mailOn !== false });
    } catch {
      setError(ta("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-labelledby={ids.title} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id={ids.title} className="text-xl font-bold text-heading">{t("title", { count: userIds.length })}</h2>
        {result ? (
          <div className="mt-4 space-y-3">
            <p role="status" className="font-semibold text-emerald-800">{t("done", { count: result.notified })}</p>
            {result.queued > 0 && <p className="text-sm text-gray-700">{t("doneEmail", { count: result.queued })}</p>}
            {result.mailOn && result.withoutEmail > 0 && <p className="text-sm text-gray-700">{t("skipped", { count: result.withoutEmail })}</p>}
            {!result.mailOn && <p className="text-sm text-gray-700">{t("mailOffDone")}</p>}
            <Button type="button" variant="save" size="compact" onClick={onClose}>{ta("close")}</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-cream-50 px-3 py-2 text-sm text-gray-800">
              {mailOn === false ? t("mailOff") : withEmail > 0 ? t("recipients", { with: withEmail, total: userIds.length }) : t("noRecipients")}
            </p>
            <div className="rounded-lg border border-gray-200 p-3 space-y-3" data-testid="announce-templates">
              <div>
                <label htmlFor={ids.load} className="mb-1.5 block text-sm font-medium text-gray-700">{t("templates.load")}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <select id={ids.load} value={chosen} onChange={(e) => loadTemplate(e.target.value)} className={`${fieldClasses()} sm:max-w-xs`} disabled={templates.length === 0}>
                    <option value="">{templates.length === 0 ? t("templates.none") : t("templates.choose")}</option>
                    {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  {chosen && !askDelete && <Button type="button" variant="ghostDanger" size="xs" onClick={() => setAskDelete(true)}>{t("templates.delete")}</Button>}
                  {chosen && askDelete && (
                    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={t("templates.deleteQuestion")}>
                      <span className="text-sm text-gray-700">{t("templates.deleteQuestion")}</span>
                      <Button type="button" variant="ghostDanger" size="xs" disabled={templateBusy} onClick={removeTemplate}>{t("templates.deleteYes")}</Button>
                      <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setAskDelete(false)}>{t("templates.deleteKeep")}</Button>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium text-gray-700">{t("templates.saveAs")}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input id={ids.name} value={saveName} maxLength={100} onChange={(e) => setSaveName(e.target.value)} autoComplete="off" className={`${fieldClasses()} sm:max-w-xs`} />
                  <Button type="button" variant="secondaryOutline" size="xs" disabled={templateBusy || !saveName.trim() || subject.en.trim().length < 3 || message.en.trim().length < 5} onClick={saveTemplate}>{t("templates.save")}</Button>
                </div>
                <p className="mt-1 text-xs text-gray-600">{t("templates.saveHint")}</p>
              </div>
              {templateNote && <p role="status" className="text-sm font-semibold text-emerald-800">{templateNote}</p>}
            </div>
            <div role="tablist" aria-label={t("languages")} className="flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lang === l ? "bg-emerald-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-cream-50"}`}
                >
                  {t(`lang.${l}`)}{l === "en" ? " *" : ""}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor={ids.subject} className="mb-1.5 block text-sm font-medium text-gray-700">{t("subject")}</label>
              <input id={ids.subject} value={subject[lang]} maxLength={150} onChange={(e) => setSubject((s) => ({ ...s, [lang]: e.target.value }))} autoComplete="off" className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.message} className="mb-1.5 block text-sm font-medium text-gray-700">{t("message")}</label>
              <textarea ref={messageRef} id={ids.message} value={message[lang]} rows={8} maxLength={5000} onChange={(e) => setMessage((m) => ({ ...m, [lang]: e.target.value }))} className={fieldClasses()} />
              <p className="mt-1 text-xs text-gray-600">{t("messageHint")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t("fields.label")}>
                <span className="text-xs text-gray-600">{t("fields.insert")}</span>
                {ANNOUNCEMENT_FIELDS.map((f) => (
                  <button key={f} type="button" onClick={() => insertField(f)} aria-label={t("fields.insertOne", { field: `{${f}}` })}
                    className="rounded-full border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">
                    {`{${f}}`}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-600">{t("fields.hint")}</p>
              {unknown.length > 0 && <p role="alert" className="mt-1 text-xs font-semibold text-amber-800">{t("fields.unknown", { fields: unknown.join(" ") })}</p>}
              {showPreview && sample && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-cream-50 p-3 text-sm" data-testid="announce-preview">
                  <p className="text-xs font-semibold text-gray-700">{t("fields.previewFor", { name: sample[lang].name || "—" })}</p>
                  <p className="mt-1 font-semibold text-heading [overflow-wrap:anywhere]">{fillFields(subject[lang], sample[lang])}</p>
                  <p className="mt-1 whitespace-pre-line text-gray-800 [overflow-wrap:anywhere]">{fillFields(message[lang], sample[lang])}</p>
                </div>
              )}
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {confirming ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{t("confirmQuestion", { count: userIds.length })}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button type="button" variant="save" size="compact" disabled={busy} onClick={send}>{busy ? t("sending") : t("confirmSend")}</Button>
                  <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={() => setConfirming(false)}>{t("back")}</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="save" size="compact" disabled={!ready} onClick={() => setConfirming(true)}>{t("send")}</Button>
                <Button type="button" variant="secondaryOutline" size="compact" onClick={onClose}>{ta("cancel")}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
