"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { fieldClasses } from "@/components/ui/FormField";
import { formatDateOnly } from "@/lib/client/registration-format";
import { REGISTRATION_STATUSES } from "@/lib/registration-lifecycle";
import SavedViews from "../SavedViews";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SearchBox from "@/components/search/ListSearch";
import BulkDecisionDialog from "@/app/[locale]/admin/BulkDecisionDialog";

interface Row {
  id: string;
  buyerNumber: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  exhibitionSlug: string;
  exhibitionTitle: string;
  status: string;
  effectiveStatus: string;
  confirmBy: string | null;
  createdAt: string;
}

interface Result {
  rows: Row[];
  total: number;
  counts: Record<string, number>;
  exhibitions: { slug: string; title: string; count: number }[];
  countries: string[];
  page: number;
  pageSize: number;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  confirmed: "bg-emerald-100 text-emerald-800",
  attended: "bg-teal-100 text-teal-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  absent: "bg-orange-100 text-orange-700",
  expired: "bg-red-100 text-red-700",
};

// Every exhibition registration of every buyer in one place: filtered on the server, one page at a time.
export default function AdminAllRegistrationsPage() {
  const t = useTranslations("adminAllRegistrations");
  const tr = useTranslations("adminRegistrationsCommon");
  const tb = useTranslations("adminBulkDecision");
  const ta = useTranslations("adminCommon");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const ids = { expo: useId(), country: useId(), sort: useId() };

  const [exhibition, setExhibition] = useState("");
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  // The filters can come with the link (the admin home links to the oldest pending registrations).
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<"approved" | "rejected" | null>(null);
  // Only the newest request may fill the screen (typing fast would otherwise show an older answer).
  const latest = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const wantedStatus = q.get("status") ?? "";
    if (wantedStatus === "expired" || (REGISTRATION_STATUSES as readonly string[]).includes(wantedStatus)) setStatus(wantedStatus);
    const wantedExpo = q.get("exhibition");
    if (wantedExpo) setExhibition(wantedExpo);
    const wantedCountry = q.get("country");
    if (wantedCountry) setCountry(wantedCountry);
    if (q.get("sort") === "oldest") setSort("oldest");
    const text = q.get("q");
    if (text) { setTyped(text); setQuery(text); }
    setReady(true);
  }, []);

  // What is typed reaches the server a moment after the last keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((prev) => {
        if (prev === typed) return prev;
        setPage(1);
        setSelected(new Set());
        return typed;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    if (exhibition) p.set("exhibition", exhibition);
    if (status !== "all") p.set("status", status);
    if (country) p.set("country", country);
    if (query.trim()) p.set("q", query.trim());
    if (sort === "oldest") p.set("sort", "oldest");
    return p;
  }, [exhibition, status, country, query, sort]);

  const load = useCallback(() => {
    const mine = ++latest.current;
    const p = params();
    p.set("page", String(page));
    return fetch(`/api/admin/expo-registrations/all?${p.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (mine !== latest.current) return;
        if (json.error) throw new Error(json.error);
        setData(json);
        setError("");
      })
      .catch(() => mine === latest.current && setError(t("loadFailed")))
      .finally(() => mine === latest.current && setLoading(false));
  }, [params, page, t]);

  useEffect(() => {
    if (!user || user.role !== "admin" || !ready) return;
    load();
  }, [user, load, ready]);

  function change(apply: () => void) {
    apply();
    setPage(1);
    setSelected(new Set());
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const counts = data?.counts ?? {};
  const countAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const filterKeys = [...REGISTRATION_STATUSES.slice(0, 4), "expired", ...REGISTRATION_STATUSES.slice(4)] as string[];
  const shownIds = rows.map((r) => r.id);
  const allShownTicked = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const filtered = exhibition !== "" || status !== "all" || country !== "" || query.trim() !== "" || sort !== "newest";
  const exportHref = `/api/admin/expo-registrations/all/export?${params().toString()}`;

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownTicked) shownIds.forEach((id) => next.delete(id));
      else shownIds.forEach((id) => next.add(id));
      return next;
    });
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  return (
    <div>
      <section className="gradient-hero py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Link href="/admin" className="text-sm text-emerald-200 hover:text-white mb-4 inline-block">{t("backToAdmin")}</Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
              <p className="mt-1 text-emerald-200/80">{loading && !data ? ta("loading") : t("count", { count: total })}</p>
            </div>
            <a
              href={exportHref}
              className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              {t("exportToExcel")}
            </a>
          </div>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4">
            <SavedViews
              page="registrations"
              filters={{ exhibition, status, country, q: typed, sort }}
              onApply={(f) => {
                setExhibition(f.exhibition ?? "");
                setStatus(f.status === "expired" || (REGISTRATION_STATUSES as readonly string[]).includes(f.status ?? "") ? f.status : "all");
                setCountry(f.country ?? "");
                setTyped(f.q ?? "");
                setQuery(f.q ?? "");
                setSort(f.sort === "oldest" ? "oldest" : "newest");
                setPage(1);
                setSelected(new Set());
              }}
            />
          </div>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor={ids.expo} className="mb-1.5 block text-sm font-medium text-gray-700">{t("exhibitionLabel")}</label>
              <select id={ids.expo} value={exhibition} onChange={(e) => change(() => setExhibition(e.target.value))} className={fieldClasses()}>
                <option value="">{t("allExhibitions")}</option>
                {(data?.exhibitions ?? []).map((e) => <option key={e.slug} value={e.slug}>{e.title} ({e.count})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.country} className="mb-1.5 block text-sm font-medium text-gray-700">{t("countryLabel")}</label>
              <select id={ids.country} value={country} onChange={(e) => change(() => setCountry(e.target.value))} className={fieldClasses()}>
                <option value="">{t("allCountries")}</option>
                {(data?.countries ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={ids.sort} className="mb-1.5 block text-sm font-medium text-gray-700">{t("sortLabel")}</label>
              <select id={ids.sort} value={sort} onChange={(e) => change(() => setSort(e.target.value as "newest" | "oldest"))} className={fieldClasses()}>
                <option value="newest">{t("newest")}</option>
                <option value="oldest">{t("oldest")}</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <SearchBox value={typed} onChange={setTyped} compact label={t("searchLabel")} placeholder={t("searchPlaceholder")} />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t("filterByStatus")}>
            {["all", ...filterKeys.filter((k) => counts[k] || status === k)].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => change(() => setStatus(k))}
                aria-pressed={status === k}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${status === k ? "border-emerald-900 bg-emerald-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
              >
                {k === "all" ? t("filterAll", { count: countAll }) : `${tr(`statuses.${k}`)} (${counts[k] ?? 0})`}
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
              <span className="text-sm font-semibold text-emerald-800">{tb("selectedCount", { count: selected.size })}</span>
              <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setBulk("approved")}>{tb("approve")}</Button>
              <Button type="button" variant="secondaryOutline" size="xs" onClick={() => setBulk("rejected")}>{tb("reject")}</Button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-emerald-700 hover:text-emerald-900 underline">{tb("clear")}</button>
            </div>
          )}

          {error && <p role="alert" className="text-red-600 text-center py-6">{error}</p>}

          {!error && data && total === 0 ? (
            <Card shadow="sm" bordered={false} className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-xl font-bold text-heading mb-2">{t("noResultsTitle")}</h2>
              <p className="text-gray-500">{filtered ? t("noResultsFiltered") : t("noResultsEmpty")}</p>
              {filtered && (
                <div className="mt-5">
                  <Button type="button" variant="secondaryOutline" size="compact" onClick={() => { setExhibition(""); setStatus("all"); setCountry(""); setSort("newest"); setTyped(""); setQuery(""); setPage(1); setSelected(new Set()); }}>{t("clearFilters")}</Button>
                </div>
              )}
            </Card>
          ) : !error && data && (
            <>
              <div className="bg-white rounded-2xl shadow-sm max-h-[calc(100vh-6rem)] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50">
                    <tr>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={allShownTicked} onChange={toggleShown} className="h-4 w-4 rounded border-gray-300" aria-label={tb("selectAll")} />
                          {t("columns.buyer")}
                        </div>
                      </th>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("columns.exhibition")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("columns.company")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("columns.contact")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("columns.status")}</th>
                      <th className="sticky top-0 z-20 bg-cream-50 shadow-[0_1px_0_0_#e5e7eb] text-left px-6 py-3 font-semibold text-gray-600">{t("columns.registered")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-cream-50 align-top">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300" aria-label={tb("selectRow", { name: r.name || tr("registrationNumber", { id: r.id }) })} />
                            <div>
                              {r.buyerNumber && <span className="block text-xs font-bold tracking-wide text-emerald-700">{r.buyerNumber}</span>}
                              {r.name || tr("registrationNumber", { id: r.id })}
                              <span className="block text-xs font-normal text-gray-500">{r.country || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/exhibitions/${r.exhibitionSlug}/registrations`} className="font-semibold text-emerald-800 underline hover:text-emerald-900 [overflow-wrap:anywhere]">{r.exhibitionTitle}</Link>
                        </td>
                        <td className="px-6 py-4 text-gray-600 [overflow-wrap:anywhere]">{r.company || "—"}</td>
                        <td className="px-6 py-4 text-gray-600 [overflow-wrap:anywhere]">{r.email || "—"}<span className="block text-xs text-gray-500">{r.phone}</span></td>
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.effectiveStatus] || STATUS_STYLE.pending}`}>{tr(`statuses.${r.effectiveStatus}`)}</span>
                          {r.effectiveStatus === "approved" && r.confirmBy && <span className="mt-1 block text-xs text-gray-500">{t("confirmBy", { date: formatDateOnly(r.confirmBy, locale) })}</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{formatDateOnly(r.createdAt.slice(0, 10), locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label={t("pagination")}>
                <p className="text-sm text-gray-600">{t("showing", { from: (data.page - 1) * pageSize + 1, to: (data.page - 1) * pageSize + rows.length, total })}</p>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondaryOutline" size="xs" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(new Set()); }}>{t("previous")}</Button>
                  <span className="text-sm text-gray-700">{t("pageOf", { page: Math.min(page, pages), pages })}</span>
                  <Button type="button" variant="secondaryOutline" size="xs" disabled={page >= pages} onClick={() => { setPage(page + 1); setSelected(new Set()); }}>{t("next")}</Button>
                </div>
              </nav>
            </>
          )}
        </div>
      </section>

      {bulk && (
        <BulkDecisionDialog
          ids={rows.filter((r) => selected.has(r.id)).map((r) => Number(r.id))}
          decision={bulk}
          onClose={() => { setBulk(null); setSelected(new Set()); }}
          onDone={() => { load(); }}
        />
      )}
    </div>
  );
}
