"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";

const ROLES = ["buyer", "exhibitor", "partner"] as const;

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  country: string;
}

interface BulkResult {
  row: number;
  name: string;
  email: string;
  password: string | null;
  status: "created" | "failed";
  reason?: string;
}

// Accepts comma- or tab-separated "name, email, phone[, country]" lines
// (the shape a spreadsheet copy-paste naturally produces), and skips a
// header row if the first line's first cell reads like one.
function parseRows(raw: string): ParsedRow[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  if (/^name$/i.test(lines[0].split(/[,\t]/)[0]?.trim() || "")) lines.shift();

  return lines.map((line) => {
    const cells = line.split(/[,\t]/).map((c) => c.trim());
    return { name: cells[0] || "", email: cells[1] || "", phone: cells[2] || "", country: cells[3] || "" };
  });
}

function downloadCsv(results: BulkResult[]) {
  const header = "name,email,password,status,reason";
  const rows = results.map((r) =>
    [r.name, r.email, r.password ?? "", r.status, r.reason ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bulk-users-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkCreateUsersPage() {
  const t = useTranslations("adminUsersBulk");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<(typeof ROLES)[number]>("buyer");
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkResult[] | null>(null);

  const preview = parseRows(raw);

  async function handleSubmit() {
    setError("");
    const rows = parseRows(raw);
    if (rows.length === 0) {
      setError(t("noRowsParsed"));
      return;
    }
    setSubmitting(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, users: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("importFailed"));
      setResults(data.results);
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return null;
  if (!user || user.role !== "admin") {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">{t("accessDenied")}</p></div>;
  }

  const createdCount = results?.filter((r) => r.status === "created").length ?? 0;
  const failedCount = results?.filter((r) => r.status === "failed").length ?? 0;

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToUsers")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("roleLabel")}</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("dataLabel")}</label>
              <p className="text-xs text-gray-400 mb-2">{t("dataHint")}</p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={10}
                placeholder={"John Doe, john@example.com, 9876543210\nJane Smith, jane@example.com, 9123456780"}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:border-emerald-500 outline-none bg-white"
              />
              {preview.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-400">{t("rowsDetected", { count: preview.length })}</p>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={submitting || preview.length === 0} variant="save">
              {submitting ? t("creating") : t("createUsersButton", { count: preview.length })}
            </Button>
          </div>

          {results && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-600">
                  {t("resultsSummary", { created: createdCount, failed: failedCount })}
                </p>
                <Button onClick={() => downloadCsv(results)} variant="ghost" size="xs">{t("downloadCsv")}</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-gray-600">{ta("name")}</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("email")}</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("passwordColumn")}</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-600">{t("statusColumn")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r) => (
                      <tr key={r.row} className="hover:bg-cream-50">
                        <td className="px-6 py-3">{r.name}</td>
                        <td className="px-6 py-3 text-gray-500">{r.email}</td>
                        <td className="px-6 py-3 font-mono text-xs">{r.password ?? "—"}</td>
                        <td className="px-6 py-3">
                          {r.status === "created" ? (
                            <span className="rounded-lg bg-green-100 text-green-700 px-2.5 py-1 text-xs font-bold">{t("statusCreated")}</span>
                          ) : (
                            <span className="rounded-lg bg-red-100 text-red-700 px-2.5 py-1 text-xs font-bold" title={r.reason}>{r.reason}</span>
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
    </div>
  );
}
