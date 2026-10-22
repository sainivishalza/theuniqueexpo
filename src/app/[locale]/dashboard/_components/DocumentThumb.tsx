"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// A document's small picture, pressed to open it full screen. A PDF cannot be drawn as a picture
// (the request for it comes back empty or as a PDF), so a "PDF file" tile is shown in its place;
// the viewer it opens offers "Open the file".
export default function DocumentThumb({
  src,
  label,
  onOpen,
  heightClass = "h-24",
  showBadge = true,
}: {
  src: string;
  /** Names the button for screen readers, e.g. "Tap to enlarge Passport Front Page". */
  label: string;
  onOpen: () => void;
  heightClass?: string;
  showBadge?: boolean;
}) {
  const t = useTranslations("adminCommon.viewer");
  const [failed, setFailed] = useState(false);
  // A new file in the same place (a replaced upload) gets a fresh try.
  useEffect(() => setFailed(false), [src]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="group relative mb-2 block w-full cursor-zoom-in rounded-lg bg-cream-50 outline-offset-2 ring-1 ring-transparent hover:ring-emerald-500"
    >
      {failed ? (
        <span className={`flex ${heightClass} w-full flex-col items-center justify-center gap-0.5 rounded-lg text-emerald-900`}>
          <span aria-hidden="true" className="text-2xl leading-none">📄</span>
          <span className="text-xs font-bold">{t("pdf")}</span>
        </span>
      ) : (
        <img src={src} alt="" onError={() => setFailed(true)} className={`${heightClass} w-full rounded-lg object-contain`} />
      )}
      {showBadge && (
        <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow group-hover:bg-emerald-700">
          {failed ? t("open") : `🔍 ${t("enlarge")}`}
        </span>
      )}
    </button>
  );
}
