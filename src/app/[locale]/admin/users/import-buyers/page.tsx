"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import ExpoSearchSelect from "@/app/[locale]/admin/wallet/_components/ExpoSearchSelect";

type Status = "created" | "expo_added" | "updated" | "already_registered" | "failed";

interface FieldChange { field: string; current: string; incoming: string }

interface ImportResult {
  row: number;
  name: string;
  buyerNumber?: string;
  loginId: string;
  password: string | null;
  status: Status;
  reason?: string;
  matchedBy?: "buyerNumber" | "passport" | "phone" | "wechat" | "email";
  fills?: FieldChange[];
  conflicts?: FieldChange[];
  used?: string[];
}

interface RepairedRow { sheet: string; row: number; buyerNumber: string; name: string; passport: string; phone: string; email: string }
interface SheetSummary { sheet: string; expo: string; hidden: boolean; rows: number; layout: string }
interface HeldRow { group: number; person: string; sheet: string; expo: string; name: string; passport: string; email: string; phone: string; company: string }
interface SkippedPerson { name: string; expos: string[]; sheets: string[]; passport: string; email: string; phone: string; why: string }
interface NameOnlyMatch { name: string; sheet: string; expo: string; matchedPerson: string; passport: string }
interface WorkbookResult {
  buyers: Record<string, unknown>[];
  held: HeldRow[];
  heldPeople: number;
  skipped: SkippedPerson[];
  nameOnlyMatches: NameOnlyMatch[];
  sheets: SheetSummary[];
  totalRows: number;
  repaired: RepairedRow[];
  loginBy: { email: number; phone: number; passport: number };
}

function downloadReview(r: WorkbookResult) {
  const lines: (string | number)[][] = [["list", "group", "person", "sheet", "expo", "name in sheet", "passport", "email", "phone", "company / why"]];
  for (const h of r.held) lines.push(["Check by hand (not imported)", h.group, h.person, h.sheet, h.expo, h.name, h.passport, h.email, h.phone, h.company]);
  for (const k of r.skipped) lines.push(["Not imported", "", k.name, k.sheets.join(" + "), k.expos.join(" + "), k.name, k.passport, k.email, k.phone, k.why]);
  for (const m of r.nameOnlyMatches) lines.push(["Name-only row attached to a person", "", m.matchedPerson, m.sheet, m.expo, m.name, m.passport, "", "", ""]);
  const csv = lines.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buyer-import-review-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CHUNK = 25;
const STATUS_STYLES: Record<Status, string> = {
  created: "bg-green-100 text-green-700",
  expo_added: "bg-blue-100 text-blue-700",
  updated: "bg-amber-100 text-amber-800",
  already_registered: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

function downloadCsv(results: ImportResult[]) {
  const header = "row,buyer number,name,login,password,status,note";
  const lines = results.map((r) =>
    [r.row, r.buyerNumber ?? "", r.name, r.loginId, r.password ?? "", r.status, r.reason ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + [header, ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buyer-import-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportBuyersPage() {
  const t = useTranslations("adminImportBuyers");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [buyers, setBuyers] = useState<Record<string, unknown>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [pasted, setPasted] = useState("");
  const [reading, setReading] = useState(false);
  const [workbook, setWorkbook] = useState<WorkbookResult | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [expoMode, setExpoMode] = useState<"sheet" | "one">("sheet");
  const [expoName, setExpoName] = useState("");
  const [knownExpos, setKnownExpos] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<ImportResult[] | null>(null);
  // Per spreadsheet row: the fields where the admin chose the file's value over the one saved.
  const [decisions, setDecisions] = useState<Record<number, string[]>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showRepaired, setShowRepaired] = useState(false);

  useEffect(() => {
    fetch("/api/admin/buyer-expos")
      .then((r) => (r.ok ? r.json() : { expos: [] }))
      .then((d: { expos?: { name: string }[] }) => setKnownExpos((d.expos ?? []).map((e) => e.name)))
      .catch(() => {});
  }, []);

  // Any change to the file or the expo makes the earlier check out of date.
  useEffect(() => { setChecked(null); }, [buyers, expoMode, expoName]);

  const attention = useMemo(() => (checked ?? []).filter((r) => (r.conflicts?.length ?? 0) > 0), [checked]);

  // The content decides, not the file name: a download saved as "…json.txt"
  // or with no ending works the same as "….json".
  function loadText(text: string, name: string) {
    setFileError("");
    setBuyers(null);
    setResults([]);
    setDecisions({});
    setDone(0);
    setFileName("");
    if (!text.trim()) return;
    // Say exactly what is wrong, so a wrong or damaged file can be told apart
    // from a good one (only the first few characters are ever shown).
    const start = text.trim().slice(0, 24).replace(/\s+/g, " ");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      setFileError(`${t("invalidFile")} — ${t("notJson", { size: text.length, start })}`);
      return;
    }
    const obj = parsed as { buyers?: unknown } | null;
    const arr = Array.isArray(parsed) ? parsed : obj?.buyers;
    if (!Array.isArray(arr) || arr.length === 0) {
      const keys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 5).join(", ") : "";
      setFileError(`${t("invalidFile")} — ${t("noBuyersList", { keys: keys || "—" })}`);
      return;
    }
    setBuyers(arr.map((b: Record<string, unknown>, i: number) => ({ ...b, row: i + 1 })));
    setFileName(name);
  }

  // The Excel file(s) are read on the server, which merges the same person
  // across sheets and prepares the list to import.
  async function handleExcel(files: FileList | null) {
    setFileError("");
    setWorkbook(null);
    setBuyers(null);
    setResults([]);
    setDecisions({});
    setDone(0);
    setFileName("");
    setPasted("");
    if (!files || files.length === 0) return;
    setReading(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const res = await fetch("/api/admin/buyers/parse-sheets", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("readFailed"));
      const wb = data as WorkbookResult;
      setWorkbook(wb);
      setBuyers(wb.buyers.map((b, i) => ({ ...b, row: i + 1 })));
      setFileName(Array.from(files).map((f) => f.name).join(", "));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : t("readFailed"));
    } finally {
      setReading(false);
    }
  }

  async function handleFile(file: File | null) {
    setWorkbook(null);
    setPasted("");
    if (!file) return loadText("", "");
    loadText(await file.text(), file.name);
  }

  function handlePaste(text: string) {
    setWorkbook(null);
    setPasted(text);
    loadText(text, t("pastedName"));
  }

  // What goes to the server: the expo chosen for everyone (if any) and, per person, the conflicts where the admin picked the file's value.
  function rowsToSend() {
    return (buyers ?? []).map((b) => ({
      ...b,
      ...(expoMode === "one" && expoName ? { expos: [expoName] } : {}),
      useNew: [...(decisions[Number(b.row)] ?? [])],
    }));
  }

  async function post(mode: "check" | "apply", setProgress: (n: number) => void): Promise<ImportResult[]> {
    const rows = rowsToSend();
    const all: ImportResult[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const res = await fetch("/api/admin/buyers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyers: rows.slice(i, i + CHUNK), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("importFailed"));
      all.push(...data.results);
      setProgress(Math.min(i + CHUNK, rows.length));
    }
    return all;
  }

  // Changes nothing: shows what the import would do, and which people have details that differ from what is saved.
  async function handleCheck() {
    if (!buyers) return;
    setChecking(true);
    setError("");
    setResults([]);
    setDone(0);
    try {
      setChecked(await post("check", setDone));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("importFailed"));
    } finally {
      setChecking(false);
    }
  }

  async function handleImport() {
    if (!buyers) return;
    setRunning(true);
    setError("");
    setResults([]);
    setDone(0);
    const all: ImportResult[] = [];
    try {
      const rows = rowsToSend();
      for (let i = 0; i < rows.length; i += CHUNK) {
        const res = await fetch("/api/admin/buyers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyers: rows.slice(i, i + CHUNK), mode: "apply" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("importFailed"));
        all.push(...data.results);
        setResults([...all]);
        setDone(Math.min(i + CHUNK, rows.length));
      }
    } catch (err) {
      // Everything already imported stays; running the same file again skips those people.
      setError(`${err instanceof Error ? err.message : t("importFailed")} — ${t("safeToRetry")}`);
    } finally {
      setRunning(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{ta("accessRequired")}</p></div>;
  }

  const count = (s: Status) => results.filter((r) => r.status === s).length;
  const shown = filter === "all" ? results : results.filter((r) => r.status === filter);

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin/users" className="py-1 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            {t("backToUsers")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-5xl px-6 space-y-6">
          {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>{t("ruleExisting")}</li>
              <li>{t("ruleNoEmail")}</li>
              <li>{t("rulePassword")}</li>
            </ul>
            <div>
              <label htmlFor="import-excel" className="block text-sm font-medium text-gray-700 mb-1">{t("excelLabel")}</label>
              <p className="text-xs text-gray-500 mb-2">{t("excelHint")}</p>
              <input id="import-excel" type="file" multiple disabled={running || reading} onChange={(e) => handleExcel(e.target.files)} className="text-sm" />
              {reading && <p className="mt-1.5 text-xs text-gray-500">{t("reading")}</p>}
            </div>

            {workbook && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3 text-sm">
                <p className="font-semibold text-emerald-900">{t("parsedSummary", { rows: workbook.totalRows, sheets: workbook.sheets.length })}</p>
                <ul className="space-y-1 text-gray-700">
                  <li>✅ {t("readyCount", { count: workbook.buyers.length, email: workbook.loginBy.email, phone: workbook.loginBy.phone, passport: workbook.loginBy.passport })}</li>
                  <li>⚠️ {t("heldCount", { count: workbook.heldPeople })}</li>
                  <li>➖ {t("skippedCount", { count: workbook.skipped.length })}</li>
                </ul>
                {workbook.repaired.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    <p>{t("repairedCount", { count: workbook.repaired.length })}</p>
                    <button type="button" aria-expanded={showRepaired} onClick={() => setShowRepaired((v) => !v)} className="mt-1 min-h-[2.75rem] text-xs font-semibold underline">
                      {showRepaired ? t("hideRepaired") : t("showRepaired")}
                    </button>
                    {showRepaired && (
                      <ul className="mt-1 space-y-0.5 text-xs [overflow-wrap:anywhere]">
                        {workbook.repaired.map((r) => (
                          <li key={`${r.sheet}-${r.row}`}>{t("repairedRow", { row: r.row, buyerNumber: r.buyerNumber, name: r.name, passport: r.passport || "—", phone: r.phone || "—" })}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("sheetsLabel")}>
                  <table className="w-full text-xs">
                    <thead className="text-left text-gray-700">
                      <tr><th className="pr-3 py-1">{t("sheetCol")}</th><th className="pr-3 py-1">{t("expoCol")}</th><th className="pr-3 py-1">{t("rowsCol")}</th><th className="py-1">{t("layoutCol")}</th></tr>
                    </thead>
                    <tbody>
                      {workbook.sheets.map((s) => (
                        <tr key={s.sheet} className={s.rows === 0 ? "text-amber-700" : "text-gray-700"}>
                          <td className="pr-3 py-0.5">{s.sheet}{s.hidden ? ` (${t("hiddenTag")})` : ""}</td>
                          <td className="pr-3 py-0.5">{s.expo}</td>
                          <td className="pr-3 py-0.5">{s.rows}{s.rows === 0 ? ` — ${t("noPeopleFound")}` : ""}</td>
                          <td className="py-0.5 text-gray-700">{s.layout}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={() => downloadReview(workbook)} variant="ghost" size="xs">{t("downloadReview")}</Button>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <label htmlFor="import-file" className="block text-sm font-medium text-gray-700 mb-1">{t("fileLabel")}</label>
              <input id="import-file" type="file" disabled={running} onChange={(e) => handleFile(e.target.files?.[0] || null)} className="text-sm" />
              <label htmlFor="import-paste" className="block text-sm font-medium text-gray-700 mt-4 mb-1">{t("pasteLabel")}</label>
              <textarea
                id="import-paste"
                value={pasted}
                disabled={running}
                onChange={(e) => handlePaste(e.target.value)}
                rows={3}
                placeholder={t("pastePlaceholder")}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 outline-none"
              />
              {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
              {buyers && <p className="mt-1.5 text-xs text-emerald-700">{t("fileLoaded", { name: fileName, count: buyers.length })}</p>}
            </div>
            {buyers && (
              <fieldset className="border-t border-gray-100 pt-4">
                <legend className="text-sm font-medium text-gray-700">{t("expoHeading")}</legend>
                <div className="mt-2 space-y-2 text-sm text-gray-700">
                  <label className="flex min-h-[2.75rem] items-center gap-2">
                    <input type="radio" name="expo-mode" checked={expoMode === "sheet"} onChange={() => setExpoMode("sheet")} disabled={running || checking} />
                    {t("expoSheet")}
                  </label>
                  <label className="flex min-h-[2.75rem] items-center gap-2">
                    <input type="radio" name="expo-mode" checked={expoMode === "one"} onChange={() => setExpoMode("one")} disabled={running || checking} />
                    {t("expoOne")}
                  </label>
                  {expoMode === "one" && (
                    <div className="max-w-md">
                      <ExpoSearchSelect
                        id="import-expo"
                        groups={[{ label: t("expoExisting"), items: knownExpos.map((name) => ({ name })) }]}
                        value={expoName}
                        onChange={setExpoName}
                        placeholder={t("expoPlaceholder")}
                        emptyText={t("expoEmpty")}
                        useTyped={(name) => t("expoUseTyped", { name })}
                        clearText={t("expoClear")}
                      />
                    </div>
                  )}
                </div>
              </fieldset>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleCheck} disabled={!buyers || running || checking || (expoMode === "one" && !expoName)} variant="secondaryOutline">
                {checking ? t("checking", { done, total: buyers?.length ?? 0 }) : t("check")}
              </Button>
              <Button onClick={handleImport} disabled={!buyers || !checked || running || checking} variant="save">
                {running ? t("importing", { done, total: buyers?.length ?? 0 }) : t("start", { count: buyers?.length ?? 0 })}
              </Button>
            </div>
            {buyers && !checked && <p className="text-xs text-gray-600">{t("checkHint")}</p>}
            {checked && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2 text-sm" data-testid="import-check">
                <p className="font-semibold text-emerald-900">{t("checkTitle")}</p>
                <ul className="space-y-1 text-gray-700">
                  <li>{t("newCount", { count: checked.filter((r) => r.status === "created").length })}</li>
                  <li>{t("fillCount", { count: checked.filter((r) => r.status === "updated").length })}</li>
                  <li>{t("expoOnlyCount", { count: checked.filter((r) => r.status === "expo_added").length })}</li>
                  <li>{t("sameCount", { count: checked.filter((r) => r.status === "already_registered").length })}</li>
                  {attention.length > 0 && <li className="font-semibold text-amber-800">{t("attentionCount", { count: attention.length })}</li>}
                  {checked.some((r) => r.status === "failed") && <li className="text-red-700">{t("failedCount", { count: checked.filter((r) => r.status === "failed").length })}</li>}
                </ul>
                {attention.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={() => setReviewOpen(true)} variant="secondaryOutline" size="compact">{t("review", { count: attention.length })}</Button>
                    <span className="text-xs text-gray-600">{t("reviewLeft")}</span>
                  </div>
                )}
                {checked.some((r) => r.status === "failed") && (
                  <ul className="max-h-48 overflow-y-auto text-xs text-red-700 [overflow-wrap:anywhere]" tabIndex={0} aria-label={t("failedLabel")}>
                    {checked.filter((r) => r.status === "failed").map((r) => <li key={r.row}>{r.name || `#${r.row}`}: {r.reason}</li>)}
                  </ul>
                )}
              </div>
            )}
            {running && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                <div className="h-full bg-emerald-600 transition-all" style={{ width: `${buyers ? Math.round((done / buyers.length) * 100) : 0}%` }} />
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(["all", "created", "updated", "expo_added", "already_registered", "failed"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={filter === s}
                      onClick={() => setFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-emerald-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      {s === "all" ? t("filterAll", { count: results.length }) : t(`status.${s}`) + ` (${count(s)})`}
                    </button>
                  ))}
                </div>
                <Button onClick={() => downloadCsv(results)} variant="ghost" size="xs">{t("downloadCsv")}</Button>
              </div>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("resultsLabel")}>
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{t("buyerNumberColumn")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{ta("name")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{t("loginColumn")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{t("passwordColumn")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{ta("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shown.map((r) => (
                      <tr key={r.row} className="hover:bg-cream-50">
                        <td className="px-4 py-2.5 text-gray-500">{r.row}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-700 whitespace-nowrap">{r.buyerNumber || "—"}</td>
                        <td className="px-4 py-2.5">{r.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 break-all">{r.loginId}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.password ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[r.status]}`}>{t(`status.${r.status}`)}</span>
                          {r.reason && <span className="ml-2 text-xs text-gray-500">{r.reason}</span>}
                          {r.matchedBy && <span className="ml-2 text-xs text-gray-500">{t("foundBy", { by: t(`matched.${r.matchedBy}`) })}</span>}
                          {!!r.fills?.length && <p className="mt-1 text-xs text-gray-600">{t("filledList", { list: r.fills.map((f) => t(`field.${f.field}`)).join(", ") })}</p>}
                          {!!r.used?.length && <p className="mt-1 text-xs text-gray-600">{t("changedList", { list: r.used.map((f) => t(`field.${f}`)).join(", ") })}</p>}
                          {!!r.conflicts?.filter((c) => !r.used?.includes(c.field)).length && (
                            <p className="mt-1 text-xs text-amber-800">{t("keptList", { list: r.conflicts.filter((c) => !r.used?.includes(c.field)).map((c) => t(`field.${c.field}`)).join(", ") })}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
      {reviewOpen && (
        <ReviewDialog
          people={attention}
          decisions={decisions}
          onChange={setDecisions}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}

// The window that shows, for each person, the details where the file disagrees with what is saved. Keeping the saved
// value is the default; nothing is overwritten unless the file's value is picked here.
function ReviewDialog({
  people,
  decisions,
  onChange,
  onClose,
}: {
  people: ImportResult[];
  decisions: Record<number, string[]>;
  onChange: (next: Record<number, string[]>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("adminImportBuyers");
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  const useFile = (row: number, field: string) => (decisions[row] ?? []).includes(field);
  function set(row: number, field: string, file: boolean) {
    const rest = (decisions[row] ?? []).filter((f) => f !== field);
    onChange({ ...decisions, [row]: file ? [...rest, field] : rest });
  }
  function setAll(file: boolean) {
    const next: Record<number, string[]> = {};
    for (const p of people) next[p.row] = file ? (p.conflicts ?? []).map((c) => c.field) : [];
    onChange(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 sm:p-6"
      data-testid="import-review"
    >
      <div className="flex w-full max-w-4xl flex-col bg-white sm:rounded-2xl">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <h2 id="review-title" className="text-lg font-extrabold text-heading">{t("reviewTitle")}</h2>
          <p className="mt-1 text-sm text-gray-700">{t("reviewIntro")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setAll(false)} variant="secondaryOutline" size="compact">{t("keepAll")}</Button>
            <Button onClick={() => setAll(true)} variant="secondaryOutline" size="compact">{t("useAll")}</Button>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          {people.map((p) => (
            <section key={p.row} aria-label={p.name} className="rounded-xl border border-gray-200 p-3">
              <h3 className="text-sm font-bold text-heading [overflow-wrap:anywhere]">
                {p.buyerNumber && <span className="mr-2 text-emerald-700">{p.buyerNumber}</span>}
                {p.name}
                {p.matchedBy && <span className="ml-2 text-xs font-normal text-gray-700">{t("foundBy", { by: t(`matched.${p.matchedBy}`) })}</span>}
              </h3>
              <ul className="mt-2 space-y-3">
                {(p.conflicts ?? []).map((c) => {
                  const name = `choice-${p.row}-${c.field}`;
                  return (
                    <li key={c.field} className="text-sm">
                      <p className="font-semibold text-gray-800">{t(`field.${c.field}`)}</p>
                      <div role="radiogroup" aria-label={t(`field.${c.field}`)} className="mt-1 grid gap-2 sm:grid-cols-2">
                        <label className={`flex min-h-[2.75rem] cursor-pointer items-start gap-2 rounded-lg border p-2 ${!useFile(p.row, c.field) ? "border-emerald-600 bg-emerald-50" : "border-gray-200"}`}>
                          <input type="radio" name={name} checked={!useFile(p.row, c.field)} onChange={() => set(p.row, c.field, false)} className="mt-1" />
                          <span className="[overflow-wrap:anywhere]"><span className="block text-xs text-gray-700">{t("keepSaved")} — {t("colSaved")}</span>{c.current}</span>
                        </label>
                        <label className={`flex min-h-[2.75rem] cursor-pointer items-start gap-2 rounded-lg border p-2 ${useFile(p.row, c.field) ? "border-emerald-600 bg-emerald-50" : "border-gray-200"}`}>
                          <input type="radio" name={name} checked={useFile(p.row, c.field)} onChange={() => set(p.row, c.field, true)} className="mt-1" />
                          <span className="[overflow-wrap:anywhere]"><span className="block text-xs text-gray-700">{t("useFile")} — {t("colFile")}</span>{c.incoming}</span>
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-[2.75rem] rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800" data-testid="import-review-close">
            {t("reviewClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
