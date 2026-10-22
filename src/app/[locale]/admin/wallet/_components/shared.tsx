"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { downloadWalletFile, errorKey, walletApi } from "@/lib/client/wallet-client";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warning", approved: "success", paid: "success", rejected: "danger", cancelled: "gray", refunded: "gray",
};

export interface Person { userId: number; name: string; email: string; buyerNumber: string }

// A page of a list from one of the admin wallet APIs, 50 at a time, with "show more".
export function useAdminList<T>(path: string, params: Record<string, string>) {
  const t = useTranslations("adminWallet");
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const page = useRef(1);
  const stamp = useRef(0);
  const query = new URLSearchParams(params).toString();

  const load = useCallback(
    async (next: number) => {
      const mine = ++stamp.current;
      setLoading(true);
      const res = await walletApi<{ items: T[]; hasMore: boolean }>(`${path}?${query}${query ? "&" : ""}page=${next}`);
      if (mine !== stamp.current) return;
      setLoading(false);
      if (!res.ok) {
        setError(t(`errors.${errorKey(res.data.code)}`));
        return;
      }
      setError("");
      page.current = next;
      setItems((prev) => (next === 1 ? res.data.items : [...prev, ...res.data.items]));
      setHasMore(res.data.hasMore);
    },
    [path, query, t]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  return {
    items, hasMore, loading, error,
    reload: () => load(1),
    loadMore: () => load(page.current + 1),
  };
}

export function PersonLine({ person }: { person: Person }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-heading [overflow-wrap:anywhere]">{person.name} <span className="font-semibold text-gray-600">{person.buyerNumber}</span></p>
      <p className="text-xs text-gray-600 [overflow-wrap:anywhere]">{person.email}</p>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONE[status] || "gray"} size="status">{label}</Badge>;
}

export function ShowMore({ hasMore, loading, onMore }: { hasMore: boolean; loading: boolean; onMore: () => void }) {
  const t = useTranslations("adminWallet");
  if (!hasMore) return null;
  return (
    <div className="mt-4 text-center">
      <Button type="button" variant="ghost" size="compact" onClick={onMore} disabled={loading}>{t("showMore")}</Button>
    </div>
  );
}

// Status filter + search box shared by the review lists.
export function ListFilters({
  statuses, status, onStatus, q, onQ, statusLabel,
}: { statuses: string[]; status: string; onStatus: (s: string) => void; q: string; onQ: (q: string) => void; statusLabel: (s: string) => string }) {
  const t = useTranslations("adminWallet");
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {statuses.length > 0 && (
        <div role="group" aria-label={t("filterStatus")} className="flex flex-wrap gap-2">
          {["", ...statuses].map((s) => (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={status === s}
              onClick={() => onStatus(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-900 focus-visible:outline-offset-2 ${
                status === s ? "bg-emerald-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-cream-50"
              }`}
            >
              {s ? statusLabel(s) : t("all")}
            </button>
          ))}
        </div>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="min-w-[14rem] flex-1 rounded-[var(--radius-button)] border border-gray-700 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
      />
    </div>
  );
}

// Waits a moment after the last keystroke before the list is asked again.
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// A picture/PDF fetched on demand (payment proofs and receipts are never part of a list).
export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("adminWallet");
  if (src.startsWith("data:image")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="max-h-[28rem] max-w-full rounded-lg border border-gray-200 bg-white object-contain" />;
  }
  return (
    <a href={src} download="document.pdf" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-cream-50">
      📄 {t("downloadPdf")}
    </a>
  );
}

// A button that downloads an Excel file from an admin export and says when it fails.
export function DownloadExcel({ path, fallbackName, label }: { path: string; fallbackName: string; label: string }) {
  const t = useTranslations("adminWallet");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run() {
    setBusy(true);
    setFailed(false);
    const res = await downloadWalletFile(path, fallbackName);
    setBusy(false);
    if (!res.ok) setFailed(true);
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondaryOutline" size="compact" disabled={busy} onClick={run}>{busy ? t("export.working") : label}</Button>
      {failed && <span role="alert" className="text-sm text-red-700">{t("export.failed")}</span>}
    </span>
  );
}
