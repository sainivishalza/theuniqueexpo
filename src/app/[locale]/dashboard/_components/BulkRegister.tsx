"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fieldClasses } from "@/components/ui/FormField";
import { Link } from "@/i18n/navigation";
import { readDocumentAsDataUrl } from "@/lib/client/image-upload";
import { formatDateOnly, STATUS_TONE } from "@/lib/client/registration-format";
import ProfileCompleteness from "./ProfileCompleteness";
import RegistrationWindowNote from "@/components/RegistrationWindowNote";
import type { Completeness } from "@/lib/profile-completeness";
import { findOverlaps, type Plan, type PlanKnown, type PlanQuestion, type SubmitResult } from "@/lib/bulk-registration";

interface Listed {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  dates: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  status: string | null;
  canRegister: boolean;
  suggestion: { reason: "history" | "profile"; field?: string } | null;
  registrationState?: "open" | "opens_later" | "deadline_passed" | "switched_off";
  registrationOpens?: string | null; registrationCloses?: string | null;
  registrationDaysToClose?: number | null; registrationDaysToOpen?: number | null;
}

type Step = "choose" | "details" | "done";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// "Register for exhibitions": tick the upcoming exhibitions you want, see what each one is, and register for all of
// them at once. What your profile already has is used; only what it lacks is asked, once, and kept on the profile.
export default function BulkRegister({ onChanged }: { onChanged: () => void }) {
  const t = useTranslations("bulkRegister");
  const tw = useTranslations("bulkRegister.window");
  const ts = useTranslations("buyerDashboard.registrations");
  const locale = useLocale();
  const ids = { search: useId(), known: useId() };
  const topRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Listed[] | null>(null);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [fileNote, setFileNote] = useState<Record<string, string>>({});
  const [results, setResults] = useState<SubmitResult[]>([]);

  const load = useCallback(() => {
    fetch(`/api/buyer-registrations?locale=${locale}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setItems(d.exhibitions);
        setCompleteness(d.completeness ?? null);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [locale]);
  useEffect(load, [load]);

  const selectable = useMemo(() => (items ?? []).filter((e) => e.canRegister), [items]);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (items ?? []).filter((e) => !q || `${e.title} ${e.city} ${e.country} ${e.industry}`.toLowerCase().includes(q));
  }, [items, filter]);
  // Suggested ones first (the order they come in is otherwise kept).
  const ordered = useMemo(() => shown.map((e, i) => ({ e, i })).sort((a, b) => Number(!!b.e.suggestion) - Number(!!a.e.suggestion) || a.i - b.i).map((x) => x.e), [shown]);
  const shownSelectable = shown.filter((e) => e.canRegister);
  const allShownSelected = shownSelectable.length > 0 && shownSelectable.every((e) => selected.has(e.slug));
  const chosen = (items ?? []).filter((e) => selected.has(e.slug));
  // Exhibitions held on the same days: a warning only (a buyer may register for both and decide later).
  const overlaps = useMemo(() => findOverlaps(items ?? [], selected), [items, selected]);
  const overlapNames = (slug: string) =>
    (overlaps.get(slug) ?? []).map((o) => (o.registered ? t("overlapRegistered", { name: o.title }) : o.title)).join(", ");

  function toggle(slug: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }
  function toggleAll() {
    setSelected((s) => {
      const next = new Set(s);
      if (allShownSelected) shownSelectable.forEach((e) => next.delete(e.slug));
      else shownSelectable.forEach((e) => next.add(e.slug));
      return next;
    });
  }

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function review() {
    setBusy(true);
    setError("");
    setBad(new Set());
    try {
      const res = await fetch("/api/buyer-registrations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: Array.from(selected), locale }),
      });
      if (!res.ok) throw new Error();
      const data: Plan = await res.json();
      const start: Record<string, string | string[]> = {};
      for (const q of data.questions) start[q.key] = q.value;
      setAnswers(start);
      setPlan(data);
      setStep("details");
      scrollTop();
    } catch {
      setError(t("planFailed"));
    } finally {
      setBusy(false);
    }
  }

  const visibleQuestions = (plan?.questions ?? []).filter((q) => {
    if (!q.showIf) return true;
    const parent = answers[q.showIf.key];
    if (q.showIf.equals !== undefined) return parent === q.showIf.equals;
    if (q.showIf.includes !== undefined) return Array.isArray(parent) && parent.includes(q.showIf.includes);
    return true;
  });

  const questionLabel = (q: PlanQuestion) => (q.core ? t(`core.${q.core}`) : q.label || "");
  const knownLabel = (k: PlanKnown) => (k.core ? t(`core.${k.core}`) : k.label || "");
  const knownValue = (k: PlanKnown) => (k.file ? t("onFile") : k.core === "gender" ? t(`genders.${k.text}`) : k.text || "");
  const optionLabel = (q: PlanQuestion, o: string) => (q.core === "gender" ? t(`genders.${o}`) : o);

  function setAnswer(key: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setBad((b) => {
      if (!b.has(key)) return b;
      const next = new Set(b);
      next.delete(key);
      return next;
    });
  }

  async function chooseFile(q: PlanQuestion, file: File | null) {
    setFileNote((n) => ({ ...n, [q.key]: "" }));
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileNote((n) => ({ ...n, [q.key]: t("fileTooLarge") }));
      return;
    }
    try {
      setAnswer(q.key, await readDocumentAsDataUrl(file));
      setFileNote((n) => ({ ...n, [q.key]: file.name }));
    } catch {
      setFileNote((n) => ({ ...n, [q.key]: t("fileUnreadable") }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setBusy(true);
    setError("");
    // Only what is on screen is sent (a hidden "please specify" is not).
    const sent: Record<string, string | string[]> = {};
    for (const q of visibleQuestions) if (answers[q.key] !== undefined) sent[q.key] = answers[q.key];
    try {
      const res = await fetch("/api/buyer-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: plan.exhibitions.filter((x) => x.state === "new" || x.state === "resubmit").map((x) => x.slug), answers: sent, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.keys) setBad(new Set<string>(data.keys));
        setError(
          data.code === "missing" ? t("errors.missing")
          : data.code === "invalid_file" ? t("errors.file")
          : data.code === "invalid" ? t("errors.invalid")
          : data.code === "form" ? t("errors.form", { message: String(data.message || ""), expo: plan.exhibitions.find((x) => x.slug === data.slug)?.title ?? "" })
          : res.status === 429 ? t("errors.tooMany")
          : t("errors.generic")
        );
        if (data.keys?.[0]) document.getElementById(`bq-${data.keys[0]}`)?.focus();
        return;
      }
      setResults(data.results);
      setStep("done");
      setSelected(new Set());
      load();
      onChanged();
      scrollTop();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  function backToList() {
    setStep("choose");
    setPlan(null);
    setError("");
    setBad(new Set());
    scrollTop();
  }

  if (failed) return <p role="alert" className="text-center text-red-600">{t("loadFailed")}</p>;
  if (items === null) return <p className="text-center text-gray-500">{t("loading")}</p>;
  if (items.length === 0) {
    return (
      <Card shadow="sm" bordered={false} className="p-6 text-center">
        <h2 className="text-lg font-bold text-heading">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-600">{t("noneOpen")}</p>
      </Card>
    );
  }

  const statusText = (s: string | null) => (s ? ts(`statusLabels.${s}`) : "");

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step === "choose" && (
        <Card shadow="sm" bordered={false} className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-heading">{t("title")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
          {completeness && completeness.missing.length > 0 && <div className="mt-4"><ProfileCompleteness completeness={completeness} link /></div>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={allShownSelected} disabled={shownSelectable.length === 0} onChange={toggleAll} className="h-5 w-5 rounded border-gray-400 accent-emerald-700" />
              {t("selectAll", { count: shownSelectable.length })}
            </label>
            <div className="ml-auto w-full sm:w-64">
              <label htmlFor={ids.search} className="sr-only">{t("search")}</label>
              <input id={ids.search} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("search")} className={fieldClasses()} />
            </div>
          </div>

          <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {shown.length === 0 && <li className="p-4 text-sm text-gray-600">{t("noMatch")}</li>}
            {ordered.map((e) => {
              const isOpen = open === e.slug;
              const cid = `be-${e.slug}`;
              return (
                <li key={e.slug} className={`p-3 sm:p-4 ${selected.has(e.slug) ? "bg-emerald-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <input
                      id={cid}
                      type="checkbox"
                      checked={selected.has(e.slug)}
                      disabled={!e.canRegister}
                      onChange={() => toggle(e.slug)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-gray-400 accent-emerald-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <label htmlFor={cid} className={`min-w-0 font-semibold [overflow-wrap:anywhere] ${e.canRegister ? "cursor-pointer text-heading" : "text-gray-600"}`}>{e.title}</label>
                        {e.status && <Badge tone={STATUS_TONE[e.status] || "gray"} size="status">{statusText(e.status)}</Badge>}
                        {e.suggestion && <Badge tone="gold" size="status">{t("suggested")}</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">
                        {e.dates}
                        {[e.city, e.country].filter(Boolean).length > 0 ? ` · ${[e.city, e.country].filter(Boolean).join(", ")}` : ""}
                      </p>
                      {e.canRegister && <RegistrationWindowNote info={e} t={tw} locale={locale} className="mt-1" />}
                      {e.suggestion && <p className="mt-1 text-sm text-gray-700 [overflow-wrap:anywhere]">{e.suggestion.reason === "history" ? t("suggestedHistory", { industry: e.industry }) : t("suggestedProfile", { field: e.suggestion.field ?? "" })}</p>}
                      {overlaps.has(e.slug) && <p className="mt-1 text-sm font-medium text-amber-900 [overflow-wrap:anywhere]"><span aria-hidden="true">⚠ </span>{t("overlapRow", { names: overlapNames(e.slug) })}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`bd-${e.slug}`}
                          onClick={() => setOpen(isOpen ? null : e.slug)}
                          className="font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2"
                        >
                          {isOpen ? t("hideDetails") : t("details")}
                        </button>
                        <Link href={`/exhibitions/${e.slug}`} target="_blank" rel="noopener" className="font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">
                          {t("openPage")}<span className="sr-only"> {t("opensNewTab")}</span>
                        </Link>
                        {!e.canRegister && e.status && <span className="text-gray-600">{t("alreadyRegistered")}</span>}
                      </div>
                      {isOpen && (
                        <dl id={`bd-${e.slug}`} className="mt-3 grid gap-x-6 gap-y-1 rounded-lg bg-white p-3 text-sm ring-1 ring-gray-200 sm:grid-cols-2">
                          <div><dt className="text-gray-600">{t("when")}</dt><dd className="font-semibold text-heading">{formatDateOnly(e.startDate, locale)}{e.endDate && e.endDate !== e.startDate ? ` – ${formatDateOnly(e.endDate, locale)}` : ""}</dd></div>
                          {e.venue && <div><dt className="text-gray-600">{t("venue")}</dt><dd className="font-semibold text-heading [overflow-wrap:anywhere]">{e.venue}</dd></div>}
                          {(e.city || e.country) && <div><dt className="text-gray-600">{t("where")}</dt><dd className="font-semibold text-heading">{[e.city, e.country].filter(Boolean).join(", ")}</dd></div>}
                          {e.industry && <div><dt className="text-gray-600">{t("industry")}</dt><dd className="font-semibold text-heading [overflow-wrap:anywhere]">{e.industry}</dd></div>}
                          {e.description && <div className="sm:col-span-2"><dt className="sr-only">{t("about")}</dt><dd className="text-gray-700 [overflow-wrap:anywhere]">{e.description}{e.description.length >= 280 ? "…" : ""}</dd></div>}
                        </dl>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {overlaps.size > 0 && <p role="status" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("overlapWarning", { count: overlaps.size })}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <p role="status" aria-live="polite" className="text-sm font-semibold text-gray-800">{selectable.length === 0 ? t("nothingToRegister") : t("selectedCount", { count: selected.size })}</p>
            <div className="ml-auto flex gap-3">
              {selected.size > 0 && <Button type="button" variant="secondaryOutline" size="compact" onClick={() => setSelected(new Set())}>{t("clear")}</Button>}
              <Button type="button" variant="save" size="compact" disabled={selected.size === 0 || busy} onClick={review}>{busy ? t("checking") : t("register", { count: selected.size })}</Button>
            </div>
          </div>
        </Card>
      )}

      {step === "details" && plan && (
        <Card shadow="sm" bordered={false} className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-heading">{t("reviewTitle")}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {plan.exhibitions.map((x) => (
              <li key={x.slug} className="flex flex-wrap items-baseline gap-x-2">
                <span aria-hidden="true">{x.state === "new" || x.state === "resubmit" ? "✅" : "⚠️"}</span>
                <span className="font-semibold text-heading [overflow-wrap:anywhere]">{x.title}</span>
                {x.state === "resubmit" && <span className="text-gray-600">{t("again")}</span>}
                {x.state === "already_registered" && <span className="text-gray-600">{t("states.already_registered")}</span>}
                {x.state === "closed" && <span className="text-gray-600">{t("states.closed")}</span>}
                {x.state === "unknown" && <span className="text-gray-600">{t("states.unknown")}</span>}
              </li>
            ))}
          </ul>

          {plan.known.length > 0 && (
            <section aria-labelledby={ids.known} className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
              <h3 id={ids.known} className="text-sm font-bold text-heading">{t("fromProfile")}</h3>
              <p className="mt-1 text-xs text-gray-700">{t("fromProfileHelp")}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {plan.known.map((k) => {
                  const sending = plan.exhibitions.filter((x) => x.state === "new" || x.state === "resubmit").length;
                  const names = k.exhibitions.length === sending ? "" : t("forExhibitions", { names: k.exhibitions.map((s) => plan.exhibitions.find((x) => x.slug === s)?.title ?? s).join(", ") });
                  return (
                    <div key={k.key} className="min-w-0">
                      <dt className="text-xs text-gray-600">{knownLabel(k)}</dt>
                      <dd className="font-medium text-heading [overflow-wrap:anywhere]">{knownValue(k)}</dd>
                      {names && <dd className="text-xs text-gray-600 [overflow-wrap:anywhere]">{names}</dd>}
                    </div>
                  );
                })}
              </dl>
              <p className="mt-3 text-xs">
                <Link href="/dashboard/buyer/profile" target="_blank" rel="noopener" className="font-semibold text-emerald-800 underline hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2">{t("editProfile")}</Link>
              </p>
            </section>
          )}

          <form onSubmit={submit} className="mt-5" noValidate>
            {visibleQuestions.length > 0 ? (
              <>
                <p className="rounded-lg bg-cream-50 px-3 py-2 text-sm text-gray-800">{t("needMore")}</p>
                <div className="mt-4 space-y-5">
                  {visibleQuestions.map((q) => {
                    const id = `bq-${q.key}`;
                    const isBad = bad.has(q.key);
                    const value = answers[q.key];
                    const label = questionLabel(q);
                    const need = q.exhibitions.length === plan.exhibitions.filter((x) => x.state === "new" || x.state === "resubmit").length ? "" : t("neededFor", { names: q.exhibitions.map((s) => plan.exhibitions.find((x) => x.slug === s)?.title ?? s).join(", ") });
                    return (
                      <div key={q.key} className={`rounded-xl p-3 ${isBad ? "ring-2 ring-red-500" : ""}`}>
                        {q.kind === "radio" || q.kind === "checkbox" ? (
                          <fieldset aria-describedby={`${id}-h`}>
                            <legend className="mb-1.5 text-sm font-medium text-gray-800">{label}{q.required && <span className="text-red-700"> *</span>}{!q.required && <span className="font-normal text-gray-600"> ({t("optional")})</span>}</legend>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                              {(q.options ?? []).map((o, i) => (
                                <label key={o} className="flex items-center gap-2 text-sm text-gray-800">
                                  <input
                                    id={i === 0 ? id : undefined}
                                    type={q.kind === "radio" ? "radio" : "checkbox"}
                                    name={id}
                                    checked={q.kind === "radio" ? value === o : Array.isArray(value) && value.includes(o)}
                                    onChange={() => {
                                      if (q.kind === "radio") setAnswer(q.key, o);
                                      else {
                                        const cur = Array.isArray(value) ? value : [];
                                        setAnswer(q.key, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]);
                                      }
                                    }}
                                    className="h-5 w-5 accent-emerald-700"
                                  />
                                  {optionLabel(q, o)}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        ) : (
                          <>
                            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-800">{label}{q.required && <span className="text-red-700"> *</span>}{!q.required && <span className="font-normal text-gray-600"> ({t("optional")})</span>}</label>
                            {q.kind === "select" && (
                              <select id={id} value={typeof value === "string" ? value : ""} onChange={(e) => setAnswer(q.key, e.target.value)} className={fieldClasses()} aria-describedby={`${id}-h`}>
                                <option value="">{t("choose")}</option>
                                {(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                            {q.kind === "text" && (
                              <input id={id} type={q.core === "email" ? "email" : "text"} value={typeof value === "string" ? value : ""} maxLength={q.core === "passportNumber" ? 100 : q.core === "phone" ? 50 : 1000} onChange={(e) => setAnswer(q.key, e.target.value)} className={fieldClasses()} autoComplete="off" aria-describedby={`${id}-h`} />
                            )}
                            {q.kind === "textarea" && (
                              <textarea id={id} rows={3} value={typeof value === "string" ? value : ""} maxLength={5000} onChange={(e) => setAnswer(q.key, e.target.value)} className={fieldClasses()} aria-describedby={`${id}-h`} />
                            )}
                            {q.kind === "file" && (
                              <div>
                                <input id={id} type="file" accept="image/*,application/pdf" onChange={(e) => chooseFile(q, e.target.files?.[0] ?? null)} aria-describedby={`${id}-h`} className="block w-full text-sm" />
                                {typeof value === "string" && value.startsWith("data:") && <p className="mt-1 text-sm text-emerald-800">{t("fileChosen", { name: fileNote[q.key] || "" })}</p>}
                                {q.hasFile && !(typeof value === "string" && value.startsWith("data:")) && <p className="mt-1 text-sm text-emerald-800">{t("fileSaved")}</p>}
                                {fileNote[q.key] && !(typeof value === "string" && value.startsWith("data:")) && <p className="mt-1 text-sm text-red-700">{fileNote[q.key]}</p>}
                              </div>
                            )}
                          </>
                        )}
                        <p id={`${id}-h`} className="mt-1 text-xs text-gray-600">
                          {q.help ? `${q.help}${/[.!?。！？]$/.test(q.help.trim()) ? "" : "."} ` : ""}{need}{need || q.help ? " " : ""}{q.savedTo === "profile" ? t("savedToProfile") : t("savedForNext")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{t("allKnown")}</p>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" variant="save" size="compact" disabled={busy || plan.exhibitions.every((x) => x.state !== "new" && x.state !== "resubmit")}>
                {busy ? t("submitting") : t("submit", { count: plan.exhibitions.filter((x) => x.state === "new" || x.state === "resubmit").length })}
              </Button>
              <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={backToList}>{t("back")}</Button>
            </div>
          </form>
        </Card>
      )}

      {step === "done" && (
        <Card shadow="sm" bordered={false} className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-heading">{t("doneTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm" aria-label={t("doneTitle")}>
            {results.map((r) => (
              <li key={r.slug} className="flex flex-wrap items-baseline gap-x-2">
                <span aria-hidden="true">{r.outcome === "registered" || r.outcome === "registered_again" ? "✅" : r.outcome === "failed" ? "❌" : "ℹ️"}</span>
                <span className="font-semibold text-heading [overflow-wrap:anywhere]">{r.title}</span>
                <span className="text-gray-700">{r.waitlisted ? t("outcomes.waitlisted") : t(`outcomes.${r.outcome}`)}</span>
              </li>
            ))}
          </ul>
          <p role="status" className="mt-3 text-sm text-gray-700">{t("doneHint")}</p>
          <div className="mt-4"><Button type="button" variant="save" size="compact" onClick={backToList}>{t("doneButton")}</Button></div>
        </Card>
      )}
    </div>
  );
}
