"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Link } from "@/i18n/navigation";
import { errorMessage } from "@/lib/format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface Batch {
  id: number;
  originalFilename: string;
  status: "uploading" | "processing" | "review" | "finalizing" | "done" | "failed";
  errorMessage: string | null;
  totalFiles: number;
  totalGroups: number;
}

interface Group {
  id: number;
  groupKey: string;
  detectedName: string | null;
  confirmedName: string | null;
  passportFilename: string | null;
  fileList: string[];
  detectionStatus: "detected" | "low_confidence" | "not_found";
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

export default function AdminPhotoOrganizerPage() {
  const t = useTranslations("adminPhotoOrganizer");
  const ta = useTranslations("adminCommon");
  const { user, loading: authLoading } = useAuth();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(batchId: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/photo-organizer/${batchId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("statusCheckFailed"));
        setBatch(data.batch);
        if (data.batch.status === "review" || data.batch.status === "done") {
          setGroups(data.groups);
          setNames(Object.fromEntries(data.groups.map((g: Group) => [g.id, g.confirmedName || g.detectedName || ""])));
        }
        if (["review", "done", "failed"].includes(data.batch.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        setError(errorMessage(err, ta("somethingWentWrong")));
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
  }

  function handleFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(t("mustBeZip"));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(t("tooLarge"));
      return;
    }

    setUploadProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/photo-organizer/upload");
    xhr.setRequestHeader("X-Filename", file.name);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploadProgress(null);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status !== 201) throw new Error(data.error || t("uploadFailed"));
        setBatch({ id: data.batchId, originalFilename: file.name, status: "processing", errorMessage: null, totalFiles: 0, totalGroups: 0 });
        startPolling(data.batchId);
      } catch (err) {
        setError(errorMessage(err, ta("somethingWentWrong")));
      }
    };
    xhr.onerror = () => {
      setUploadProgress(null);
      setError(t("uploadFailed"));
    };
    xhr.send(file);
  }

  async function handleFinalize() {
    if (!batch) return;
    setFinalizing(true);
    setError("");
    try {
      // Persist any edited names before building the zip.
      await Promise.all(
        groups.map((g) => {
          const name = (names[g.id] || "").trim();
          if (!name || name === (g.confirmedName || g.detectedName || "")) return null;
          return fetch(`/api/admin/photo-organizer/${batch.id}/groups/${g.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmedName: name }),
          });
        })
      );

      const res = await fetch(`/api/admin/photo-organizer/${batch.id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("finalizeFailed"));

      window.location.href = `/api/admin/photo-organizer/${batch.id}/download`;
      setBatch((prev) => (prev ? { ...prev, status: "done" } : prev));
    } catch (err) {
      setError(errorMessage(err, ta("somethingWentWrong")));
    } finally {
      setFinalizing(false);
    }
  }

  async function handleReset() {
    if (batch) {
      await fetch(`/api/admin/photo-organizer/${batch.id}`, { method: "DELETE" }).catch(() => {});
    }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setBatch(null);
    setGroups([]);
    setNames({});
    setError("");
  }

  if (authLoading) return null;

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">{t("accessDenied")}</p>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-8">
        <div className="mx-auto max-w-5xl px-6">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t("backToAdmin")}
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-1 text-gray-400 text-sm">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-10 bg-cream-50">
        <div className="mx-auto max-w-5xl px-6 space-y-6">
          {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          {!batch && (
            <Card shadow="sm" className="p-8 text-center">
              <p className="text-gray-600 mb-4">{t("uploadPrompt")}</p>
              <label className="inline-block cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-sm font-semibold transition-colors">
                {t("chooseZip")}
                <input type="file" accept=".zip" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              </label>
              <p className="mt-3 text-xs text-gray-400">{t("sizeLimitNote")}</p>
            </Card>
          )}

          {uploadProgress !== null && (
            <Card shadow="sm" className="p-6">
              <p className="text-sm font-semibold text-heading mb-2">{t("uploading", { percent: uploadProgress })}</p>
              <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </Card>
          )}

          {batch && (batch.status === "processing" || batch.status === "uploading") && (
            <Card shadow="sm" className="p-8 text-center">
              <p className="text-gray-600">{t("processing")}</p>
              <p className="text-xs text-gray-400 mt-1">{t("processingNote")}</p>
            </Card>
          )}

          {batch && batch.status === "failed" && (
            <Card shadow="sm" className="p-8 text-center">
              <p className="text-red-600 mb-4">{batch.errorMessage || t("processingFailed")}</p>
              <Button onClick={handleReset} variant="ghost" size="compact">{t("startOver")}</Button>
            </Card>
          )}

          {batch && (batch.status === "review" || batch.status === "finalizing" || batch.status === "done") && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-600">{t("groupsFound", { count: groups.length, files: batch.totalFiles })}</p>
                <div className="flex gap-2">
                  <Button onClick={handleReset} variant="ghost" size="compact">{t("startOver")}</Button>
                  <Button onClick={handleFinalize} disabled={finalizing || batch.status === "finalizing"} variant="gradientCta" size="compact">
                    {finalizing || batch.status === "finalizing" ? t("finalizing") : t("finalizeAndDownload")}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {groups.map((g) => (
                  <Card key={g.id} shadow="sm" className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                      {g.passportFilename ? (
                        <img
                          src={`/api/admin/photo-organizer/${batch.id}/thumbnail/${g.id}`}
                          alt={t("passportThumbnailAlt")}
                          className="img-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                          {t("noPassportFound")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={names[g.id] || ""}
                        onChange={(e) => setNames((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        {t("fileCount", { count: g.fileList.length })} &middot; {g.groupKey}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <DetectionBadge status={g.detectionStatus} t={t} />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function DetectionBadge({ status, t }: { status: Group["detectionStatus"]; t: ReturnType<typeof useTranslations> }) {
  if (status === "detected") return <Badge tone="success" size="tag">{t("detectionDetected")}</Badge>;
  if (status === "low_confidence") return <Badge tone="warning" size="tag">{t("detectionLowConfidence")}</Badge>;
  return <Badge tone="gray" size="tag">{t("detectionNotFound")}</Badge>;
}
