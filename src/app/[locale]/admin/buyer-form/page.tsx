"use client";
import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/FormField";
import { itemLabel, MAX_LABEL_LENGTH, type FieldType, type FormItem, type FormItemKind } from "@/lib/buyer-form";

type Item = FormItem & { inUse: boolean };

interface FormData {
  ready: boolean;
  documents: Item[];
  fields: Item[];
}

interface Draft {
  en: string;
  ru: string;
  zh: string;
  required: boolean;
  fieldType: FieldType;
  optEn: string;
  optRu: string;
  optZh: string;
}

const EMPTY_DRAFT: Draft = { en: "", ru: "", zh: "", required: true, fieldType: "text", optEn: "", optRu: "", optZh: "" };

function draftOf(item: Item): Draft {
  return {
    en: item.labels.en,
    ru: item.labels.ru,
    zh: item.labels.zh,
    required: item.required,
    fieldType: item.fieldType ?? "text",
    optEn: item.options.en.join("\n"),
    optRu: item.options.ru.join("\n"),
    optZh: item.options.zh.join("\n"),
  };
}

// The form for adding an item or editing one: the name in each language, whether a document
// must be uploaded for a buyer to count as Verified, and (for a choice field) the choices.
function ItemForm({
  kind, existing, busy, onSave, onCancel,
}: { kind: FormItemKind; existing?: Item; busy: boolean; onSave: (draft: Draft) => void; onCancel: () => void }) {
  const t = useTranslations("adminBuyerForm");
  const ta = useTranslations("adminCommon");
  const ids = { en: useId(), ru: useId(), zh: useId(), type: useId(), oEn: useId(), oRu: useId(), oZh: useId(), req: useId() };
  const [draft, setDraft] = useState<Draft>(existing ? draftOf(existing) : EMPTY_DRAFT);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const isChoice = kind === "field" && draft.fieldType === "choice";
  const ready = draft.en.trim().length > 0 && (!isChoice || draft.optEn.split("\n").filter((l) => l.trim()).length >= 2);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSave(draft);
      }}
      className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={ids.en} className="mb-1 block text-xs font-semibold text-gray-600">{t("nameEn")}</label>
          <input id={ids.en} value={draft.en} maxLength={MAX_LABEL_LENGTH} onChange={(e) => set("en", e.target.value)} autoComplete="off" className={fieldClasses()} />
        </div>
        <div>
          <label htmlFor={ids.ru} className="mb-1 block text-xs font-semibold text-gray-600">{t("nameRu")}</label>
          <input id={ids.ru} value={draft.ru} maxLength={MAX_LABEL_LENGTH} onChange={(e) => set("ru", e.target.value)} autoComplete="off" className={fieldClasses()} />
        </div>
        <div>
          <label htmlFor={ids.zh} className="mb-1 block text-xs font-semibold text-gray-600">{t("nameZh")}</label>
          <input id={ids.zh} value={draft.zh} maxLength={MAX_LABEL_LENGTH} onChange={(e) => set("zh", e.target.value)} autoComplete="off" className={fieldClasses()} />
        </div>
      </div>
      <p className="text-xs text-gray-600">{t("nameHint")}</p>

      {kind === "document" && (
        <label htmlFor={ids.req} className="flex items-start gap-2 text-sm text-gray-800">
          <input id={ids.req} type="checkbox" checked={draft.required} onChange={(e) => set("required", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
          <span>
            <span className="font-semibold">{t("requiredLabel")}</span>
            <span className="block text-xs text-gray-600">{t("requiredHint")}</span>
          </span>
        </label>
      )}

      {kind === "field" && !existing && (
        <div className="max-w-xs">
          <label htmlFor={ids.type} className="mb-1 block text-xs font-semibold text-gray-600">{t("typeLabel")}</label>
          <select id={ids.type} value={draft.fieldType} onChange={(e) => set("fieldType", e.target.value as FieldType)} className={fieldClasses()}>
            {(["text", "longtext", "date", "choice"] as FieldType[]).map((ft) => <option key={ft} value={ft}>{t(`types.${ft}`)}</option>)}
          </select>
        </div>
      )}

      {isChoice && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">{t("optionsHint")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={ids.oEn} className="mb-1 block text-xs font-semibold text-gray-600">{t("optionsEn")}</label>
              <textarea id={ids.oEn} rows={5} value={draft.optEn} onChange={(e) => set("optEn", e.target.value)} className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.oRu} className="mb-1 block text-xs font-semibold text-gray-600">{t("optionsRu")}</label>
              <textarea id={ids.oRu} rows={5} value={draft.optRu} onChange={(e) => set("optRu", e.target.value)} className={fieldClasses()} />
            </div>
            <div>
              <label htmlFor={ids.oZh} className="mb-1 block text-xs font-semibold text-gray-600">{t("optionsZh")}</label>
              <textarea id={ids.oZh} rows={5} value={draft.optZh} onChange={(e) => set("optZh", e.target.value)} className={fieldClasses()} />
            </div>
          </div>
          {existing && <p className="text-xs text-amber-800">{t("optionsChangeNote")}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="save" size="compact" disabled={busy || !ready}>{busy ? ta("saving") : ta("save")}</Button>
        <Button type="button" variant="ghost" size="compact" onClick={onCancel} disabled={busy}>{ta("cancel")}</Button>
      </div>
    </form>
  );
}

export default function AdminBuyerFormPage() {
  const t = useTranslations("adminBuyerForm");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<FormItemKind | null>(null);

  const errorText = useCallback(
    (code: unknown) => (typeof code === "string" && ["invalid_input", "options_mismatch", "limit", "in_use", "builtin", "not_found", "not_ready"].includes(code) ? t(`errors.${code}`) : ta("somethingWentWrong")),
    [t, ta]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/buyer-form");
      const json = await res.json();
      if (!res.ok) throw new Error();
      setData(json);
    } catch {
      setError(t("loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function call(key: string | null, path: string, method: string, body?: unknown): Promise<boolean> {
    setBusyKey(key ?? "new");
    setError("");
    setNotice("");
    try {
      const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(json.code));
        return false;
      }
      await load();
      return true;
    } catch {
      setError(ta("somethingWentWrong"));
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  function payload(kind: FormItemKind, d: Draft, existing?: Item) {
    const body: Record<string, unknown> = { labels: { en: d.en, ru: d.ru, zh: d.zh } };
    if (kind === "document") body.required = d.required;
    const choice = kind === "field" && (existing ? existing.fieldType === "choice" : d.fieldType === "choice");
    if (choice) body.options = { en: d.optEn, ru: d.optRu, zh: d.optZh };
    return body;
  }

  async function add(kind: FormItemKind, d: Draft) {
    const body = { kind, ...payload(kind, d), ...(kind === "field" ? { fieldType: d.fieldType } : {}) };
    if (await call(null, "/api/admin/buyer-form", "POST", body)) {
      setAdding(null);
      setNotice(t("added"));
    }
  }

  async function save(item: Item, d: Draft) {
    if (await call(item.key, `/api/admin/buyer-form/${item.key}`, "PATCH", payload(item.kind, d, item))) {
      setEditing(null);
      setNotice(t("saved"));
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(t("deleteConfirm", { name: itemLabel(item, locale) }))) return;
    if (await call(item.key, `/api/admin/buyer-form/${item.key}`, "DELETE")) setNotice(t("deleted"));
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  function Section({ kind, items }: { kind: FormItemKind; items: Item[] }) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-heading">{t(kind === "document" ? "documentsTitle" : "fieldsTitle")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t(kind === "document" ? "documentsHint" : "fieldsHint")}</p>
          </div>
          <Button type="button" variant="save" size="compact" onClick={() => { setAdding(kind); setEditing(null); }} disabled={!data?.ready || adding === kind}>
            {t(kind === "document" ? "addDocument" : "addField")}
          </Button>
        </div>

        {adding === kind && (
          <div className="mt-4">
            <ItemForm kind={kind} busy={busyKey === "new"} onSave={(d) => add(kind, d)} onCancel={() => setAdding(null)} />
          </div>
        )}

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">{t("emptyFields")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {items.map((item, index) => (
              <li key={item.key} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[10rem] flex-1">
                    <p className={`break-words font-semibold ${item.active ? "text-gray-900" : "text-gray-500"}`}>{itemLabel(item, locale)}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{item.builtin ? t("badgeBuiltin") : t("badgeAdded")}</span>
                      {!item.active && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{t("badgeHidden")}</span>}
                      {kind === "document" && <span className={`rounded-full px-2 py-0.5 ${item.required ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{item.required ? t("badgeRequired") : t("badgeOptional")}</span>}
                      {kind === "field" && item.fieldType && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">{t(`types.${item.fieldType}`)}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="ghost" size="compact" onClick={() => call(item.key, `/api/admin/buyer-form/${item.key}`, "PATCH", { move: "up" })} disabled={index === 0 || busyKey === item.key} aria-label={`${t("moveUp")}: ${itemLabel(item, locale)}`}>↑</Button>
                    <Button type="button" variant="ghost" size="compact" onClick={() => call(item.key, `/api/admin/buyer-form/${item.key}`, "PATCH", { move: "down" })} disabled={index === items.length - 1 || busyKey === item.key} aria-label={`${t("moveDown")}: ${itemLabel(item, locale)}`}>↓</Button>
                    <Button type="button" variant="ghost" size="compact" onClick={() => { setEditing(editing === item.key ? null : item.key); setAdding(null); }} disabled={busyKey === item.key}>{t("edit")}</Button>
                    <Button type="button" variant="ghost" size="compact" onClick={() => call(item.key, `/api/admin/buyer-form/${item.key}`, "PATCH", { active: !item.active })} disabled={busyKey === item.key}>{item.active ? t("hide") : t("show")}</Button>
                    {!item.builtin && <Button type="button" variant="ghostDanger" size="compact" onClick={() => remove(item)} disabled={busyKey === item.key || item.inUse} title={item.inUse ? t("deleteBlocked") : undefined}>{ta("delete")}</Button>}
                  </div>
                </div>
                {editing === item.key && (
                  <div className="mt-3">
                    <ItemForm kind={kind} existing={item} busy={busyKey === item.key} onSave={(d) => save(item, d)} onCancel={() => setEditing(null)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            {ta("backToAdmin")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">{notice}</div>}
          {data && !data.ready && <div role="alert" className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{t("notReady")}</div>}
          {!data && !error && <p className="text-sm text-gray-600">{ta("loading")}</p>}
          {data && (
            <>
              <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">{t("howItWorks")}</p>
              {Section({ kind: "document", items: data.documents })}
              {Section({ kind: "field", items: data.fields })}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
