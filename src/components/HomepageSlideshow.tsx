"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export interface SlideshowPhoto {
  id: string;
  image: string;
  caption: string;
}

const AUTO_ADVANCE_MS = 4500;
// Below this, a touch/drag is treated as a tap (opens the zoom view)
// rather than a swipe (changes slide).
const SWIPE_THRESHOLD_PX = 40;

export default function HomepageSlideshow({ photos }: { photos: SlideshowPhoto[] }) {
  const t = useTranslations("homepageSlideshow");
  const [index, setIndex] = useState(0);
  // Once true, auto-advance stops for good -- the visitor took the wheel.
  const [autoAdvancing, setAutoAdvancing] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);

  const count = photos.length;

  const goTo = useCallback(
    (next: number, userInitiated: boolean) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
      if (userInitiated) setAutoAdvancing(false);
    },
    [count]
  );

  // Auto-advance -- stops permanently the moment the visitor interacts
  // (arrow, dot, swipe, or opening the zoom view), and pauses while the
  // lightbox is open even before that so it doesn't jump mid-zoom.
  useEffect(() => {
    if (!autoAdvancing || lightboxOpen || count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoAdvancing, lightboxOpen, count]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goTo(index - 1, true);
      if (e.key === "ArrowRight") goTo(index + 1, true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, index, goTo]);

  function handleTouchStart(e: React.TouchEvent) {
    dragStartX.current = e.touches[0].clientX;
    dragDeltaX.current = 0;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (dragStartX.current === null) return;
    dragDeltaX.current = e.touches[0].clientX - dragStartX.current;
  }
  function handleTouchEnd() {
    if (dragStartX.current === null) return;
    const delta = dragDeltaX.current;
    dragStartX.current = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      goTo(index + (delta < 0 ? 1 : -1), true);
    } else {
      setAutoAdvancing(false);
    }
  }

  if (count === 0) return null;
  const current = photos[index];

  return (
    <section className="relative bg-black">
      <div
        className="relative w-full aspect-[16/7] min-h-[220px] max-h-[520px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => {
              setZoomed(false);
              setLightboxOpen(true);
              setAutoAdvancing(false);
            }}
            aria-label={t("zoomHint")}
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out cursor-zoom-in ${
              i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Plain <img>, not next/image: these are admin-uploaded data:
                URLs as often as external links, and next/image's optimizer
                can't proxy arbitrary base64 payloads. */}
            <img src={photo.image} alt={photo.caption || ""} className="w-full h-full object-cover" />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4 text-left">
                <p className="text-white text-sm md:text-base font-medium">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1, true)}
              aria-label={t("previous")}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1, true)}
              aria-label={t("next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => goTo(i, true)}
                  aria-label={t("goToSlide", { number: i + 1 })}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label={t("close")}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setZoomed(false);
                  goTo(index - 1, true);
                }}
                aria-label={t("previous")}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomed(false);
                  goTo(index + 1, true);
                }}
                aria-label={t("next")}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}

          <div className="w-full h-full flex items-center justify-center overflow-auto p-6 md:p-10">
            <img
              src={current.image}
              alt={current.caption || ""}
              onClick={() => setZoomed((z) => !z)}
              className={`transition-transform duration-300 ease-out select-none ${
                zoomed ? "max-w-none w-[180%] md:w-[160%] cursor-zoom-out" : "max-w-full max-h-full object-contain cursor-zoom-in"
              }`}
            />
          </div>

          {current.caption && !zoomed && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/90 text-sm px-4 text-center max-w-xl">
              {current.caption}
            </p>
          )}
          <p className="absolute bottom-4 right-4 text-white/50 text-xs hidden md:block">{t("zoomHint")}</p>
        </div>
      )}
    </section>
  );
}
