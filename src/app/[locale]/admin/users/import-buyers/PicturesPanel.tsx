"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import { planPictures, previewOf, type PictureBuyer, type PicturePlan, type PersonPlan } from "@/lib/client/picture-import";
import type { ZipEntry } from "@/lib/client/zip-reader";

// The documents a buyer's profile holds, in the order they are listed.
export const PICTURE_SLOTS = ["passportFront", "visaPage", "businessCard", "cantonFairCard", "buyerPhoto", "businessLicense", "invoiceOrderList", "latestEntryStamp"] as const;

export interface SavedDocuments {
  [row: number]: Record<string, { status: string }> | undefined;
}

interface Props {
  buyers: PictureBuyer[] | null;
  zip: File | null;
  onZip: (file: File | null) => void;
  plan: PicturePlan | null;
  onPlan: (plan: PicturePlan | null) => void;
  // Documents buyers already have, from the check of the Excel file.
  saved: SavedDocuments;
  // The saved documents the admin chose to replace, per spreadsheet row.
  replace: Record<number, string[]>;
  onReplace: (next: Record<number, string[]>) => void;
  disabled: boolean;
}

export default function PicturesPanel({ buyers, zip, onZip, plan, onPlan, saved, replace, onReplace, disabled }: Props) {
  const t = useTranslations("adminImportBuyers");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  // Whenever the ZIP or the Excel people change, the pictures are matched again.
  useEffect(() => {
    onPlan(null);
    setError("");
    if (!zip || !buyers) return;
    let stop = false;
    setProgress({ done: 0, total: buyers.length });
    planPictures(zip, buyers, (done, total) => !stop && setProgress({ done, total }), () => stop)
      .then((result) => { if (!stop) onPlan(result); })
      .catch((err) => { if (!stop) setError(err instanceof Error && err.message ? `${t("pictures.readFailed")}: ${err.message}` : t("pictures.readFailed")); })
      .finally(() => { if (!stop) setProgress(null); });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, buyers]);

  const stats = plan?.stats;
  return (
    <div className="border-t border-gray-100 pt-4">
      <label htmlFor="import-zip" className="block text-sm font-medium text-gray-700 mb-1">{t("pictures.zipLabel")}</label>
      <p className="text-xs text-gray-700 mb-2">{buyers ? t("pictures.zipHint") : t("pictures.needExcel")}</p>
      <input
        id="import-zip"
        type="file"
        accept=".zip,application/zip"
        disabled={disabled || !buyers || !!progress}
        onChange={(e) => onZip(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {progress && <p role="status" className="mt-1.5 text-xs text-gray-700">{t("pictures.reading", progress)}</p>}
      {error && <p role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}
      {plan && stats && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2 text-sm" data-testid="pictures-summary">
          <p className="font-semibold text-emerald-900">{t("pictures.summaryTitle")}</p>
          <ul className="space-y-1 text-gray-700">
            <li>{t("pictures.placedCount", { count: stats.placed })}</li>
            <li>{t("pictures.sortedCount", { count: stats.sorted })}</li>
            {stats.flagged > 0 && <li className="font-semibold text-amber-800">{t("pictures.flaggedCount", { count: stats.flagged })}</li>}
            {stats.withoutPictures > 0 && <li>{t("pictures.withoutCount", { count: stats.withoutPictures })}</li>}
            {stats.unused > 0 && <li>{t("pictures.unusedCount", { count: stats.unused })}</li>}
            {stats.unreadable > 0 && <li className="text-red-700">{t("pictures.unreadableCount", { count: stats.unreadable })}</li>}
          </ul>
          <Button onClick={() => setOpen(true)} variant="secondaryOutline" size="compact">{t("pictures.review")}</Button>
        </div>
      )}
      {open && plan && zip && (
        <PicturesDialog zip={zip} plan={plan} onPlan={onPlan} saved={saved} replace={replace} onReplace={onReplace} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

const previews = new Map<string, string>();

function Thumb({ zip, entry }: { zip: File; entry: ZipEntry }) {
  const t = useTranslations("adminImportBuyers");
  const key = `${zip.name}:${zip.size}:${entry.localOffset}`;
  const [src, setSrc] = useState(previews.get(key) ?? "");
  useEffect(() => {
    if (src) return;
    let stop = false;
    previewOf(zip, entry).then((data) => { previews.set(key, data); if (!stop) setSrc(data); }).catch(() => {});
    return () => { stop = true; };
  }, [zip, entry, key, src]);
  if (!src) return <span className="flex h-24 w-20 items-center justify-center rounded bg-gray-100 text-[10px] text-gray-700">{t("pictures.loading")}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-24 w-auto max-w-[8rem] rounded border border-gray-200 object-contain" />;
}

const PAGE = 20;

function PicturesDialog({
  zip, plan, onPlan, saved, replace, onReplace, onClose,
}: {
  zip: File;
  plan: PicturePlan;
  onPlan: (plan: PicturePlan | null) => void;
  saved: SavedDocuments;
  replace: Record<number, string[]>;
  onReplace: (next: Record<number, string[]>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("adminImportBuyers");
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const [onlyCheck, setOnlyCheck] = useState(plan.stats.flagged > 0);
  const [shown, setShown] = useState(PAGE);

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

  const people = useMemo(
    () => [...plan.people].sort((a, b) => Number(b.flagged) - Number(a.flagged)).filter((p) => !onlyCheck || p.flagged),
    [plan.people, onlyCheck]
  );

  function setSlot(person: PersonPlan, imageId: number, slot: string) {
    const slots = { ...person.slots };
    // One picture per document: whoever had this document before is no longer used.
    if (slot) for (const [id, s] of Object.entries(slots)) if (s === slot) slots[Number(id)] = "";
    slots[imageId] = slot;
    onPlan({ ...plan, people: plan.people.map((p) => (p.row === person.row ? { ...p, slots, flagged: p.flagged } : p)) });
  }

  function toggleReplace(row: number, slot: string, on: boolean) {
    const rest = (replace[row] ?? []).filter((s) => s !== slot);
    onReplace({ ...replace, [row]: on ? [...rest, slot] : rest });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pictures-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 sm:p-6"
      data-testid="pictures-review"
    >
      <div className="flex w-full max-w-4xl flex-col bg-white sm:rounded-2xl">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <h2 id="pictures-title" className="text-lg font-extrabold text-heading">{t("pictures.reviewTitle")}</h2>
          <p className="mt-1 text-sm text-gray-700">{t("pictures.reviewIntro")}</p>
          <label className="mt-3 flex min-h-[2.75rem] items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyCheck} onChange={(e) => { setOnlyCheck(e.target.checked); setShown(PAGE); }} />
            {t("pictures.onlyCheck")}
          </label>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          {people.slice(0, shown).map((person) => (
            <section key={person.row} aria-label={person.name} className="rounded-xl border border-gray-200 p-3" data-testid="pictures-person">
              <h3 className="text-sm font-bold text-heading [overflow-wrap:anywhere]">
                {person.name}
                {person.flagged && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{t("pictures.pleaseCheck")}</span>}
              </h3>
              <ul className="mt-2 space-y-3">
                {[...person.images]
                  // A fixed order, so a picture does not jump to another place when its document is changed.
                  .sort((a, b) => a.id - b.id)
                  .map((image) => {
                    const slot = person.slots[image.id] ?? "";
                    const existing = slot ? saved[person.row]?.[slot] : undefined;
                    const selectId = `slot-${person.row}-${image.id}`;
                    return (
                      <li key={image.id} className="flex gap-3">
                        <Thumb zip={zip} entry={plan.entries.get(image.id)!} />
                        <div className="min-w-0 flex-1 text-sm">
                          <label htmlFor={selectId} className="block text-xs text-gray-700 [overflow-wrap:anywhere]">{image.name}</label>
                          <select
                            id={selectId}
                            value={slot}
                            onChange={(e) => setSlot(person, image.id, e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                          >
                            <option value="">{t("pictures.notUsed")}</option>
                            {PICTURE_SLOTS.map((s) => <option key={s} value={s}>{t(`pictures.slot.${s}`)}</option>)}
                          </select>
                          <p className="mt-1 text-xs text-gray-700">
                            {image.origin === "sheet" ? t("pictures.sheetBadge") : image.origin === "sorted" ? t("pictures.sortedBadge") : ""}
                            {image.check && <span className="ml-2 font-semibold text-amber-800">{t("pictures.pleaseCheck")}</span>}
                          </p>
                          {existing && (
                            <label className="mt-1 flex min-h-[2.75rem] items-start gap-2 text-xs text-gray-800">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={(replace[person.row] ?? []).includes(slot)}
                                onChange={(e) => toggleReplace(person.row, slot, e.target.checked)}
                              />
                              <span>
                                {t("pictures.replaceSaved", { slot: t(`pictures.slot.${slot}`) })}
                                <span className="block text-gray-700">{existing.status === "verified" ? t("pictures.savedVerified") : t("pictures.savedExists")} — {t("pictures.keepsSaved")}</span>
                              </span>
                            </label>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
              {person.missing.length > 0 && (
                <p className="mt-2 text-xs text-amber-800">{t("pictures.missingList", { list: person.missing.map((s) => t(`pictures.slot.${s}`)).join(", ") })}</p>
              )}
            </section>
          ))}
          {people.length > shown && (
            <Button onClick={() => setShown((n) => n + PAGE)} variant="secondaryOutline" size="compact">{t("pictures.showMore")}</Button>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-[2.75rem] rounded-lg bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800" data-testid="pictures-review-close">
            {t("reviewClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
