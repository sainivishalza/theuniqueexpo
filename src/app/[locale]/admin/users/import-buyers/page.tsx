"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

type Status = "created" | "expo_added" | "already_registered" | "failed";

interface ImportResult {
  row: number;
  name: string;
  loginId: string;
  password: string | null;
  status: Status;
  reason?: string;
}

const CHUNK = 25;
const STATUS_STYLES: Record<Status, string> = {
  created: "bg-green-100 text-green-700",
  expo_added: "bg-blue-100 text-blue-700",
  already_registered: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

function downloadCsv(results: ImportResult[]) {
  const header = "row,name,login,password,status,note";
  const lines = results.map((r) =>
    [r.row, r.name, r.loginId, r.password ?? "", r.status, r.reason ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
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
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("all");

  // The content decides, not the file name: a download saved as "…json.txt"
  // or with no ending works the same as "….json".
  function loadText(text: string, name: string) {
    setFileError("");
    setBuyers(null);
    setResults([]);
    setDone(0);
    setFileName("");
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed?.buyers;
      if (!Array.isArray(arr) || arr.length === 0) throw new Error();
      setBuyers(arr.map((b: Record<string, unknown>, i: number) => ({ ...b, row: i + 1 })));
      setFileName(name);
    } catch {
      setFileError(t("invalidFile"));
    }
  }

  async function handleFile(file: File | null) {
    setPasted("");
    if (!file) return loadText("", "");
    loadText(await file.text(), file.name);
  }

  function handlePaste(text: string) {
    setPasted(text);
    loadText(text, t("pastedName"));
  }

  async function handleImport() {
    if (!buyers) return;
    setRunning(true);
    setError("");
    setResults([]);
    setDone(0);
    const all: ImportResult[] = [];
    try {
      for (let i = 0; i < buyers.length; i += CHUNK) {
        const res = await fetch("/api/admin/buyers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyers: buyers.slice(i, i + CHUNK) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("importFailed"));
        all.push(...data.results);
        setResults([...all]);
        setDone(Math.min(i + CHUNK, buyers.length));
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
          <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
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
            <Button onClick={handleImport} disabled={!buyers || running} variant="save">
              {running ? t("importing", { done, total: buyers?.length ?? 0 }) : t("start", { count: buyers?.length ?? 0 })}
            </Button>
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
                  {(["all", "created", "expo_added", "already_registered", "failed"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-emerald-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      {s === "all" ? t("filterAll", { count: results.length }) : t(`status.${s}`) + ` (${count(s)})`}
                    </button>
                  ))}
                </div>
                <Button onClick={() => downloadCsv(results)} variant="ghost" size="xs">{t("downloadCsv")}</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{ta("name")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{t("loginColumn")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{t("passwordColumn")}</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">{ta("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shown.map((r) => (
                      <tr key={r.row} className="hover:bg-cream-50">
                        <td className="px-4 py-2.5 text-gray-400">{r.row}</td>
                        <td className="px-4 py-2.5">{r.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 break-all">{r.loginId}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.password ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[r.status]}`}>{t(`status.${r.status}`)}</span>
                          {r.reason && <span className="ml-2 text-xs text-gray-400">{r.reason}</span>}
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
    </div>
  );
}
