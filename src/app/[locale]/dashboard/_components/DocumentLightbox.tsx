"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;

// A minimal pan/zoom image viewer -- wheel or pinch to zoom, drag or
// single-finger swipe to pan once zoomed in, double-click/double-tap to
// toggle between fit and 2.5x. No new dependency for something this small.
// Shared by the admin buyer list and the buyer's own profile. Its button
// labels come from adminCommon.viewer, a namespace both /admin and /dashboard load.
export default function DocumentLightbox({
  src,
  title,
  statusLabel,
  statusClass,
  onClose,
}: {
  src: string;
  title: string;
  statusLabel?: string;
  statusClass?: string;
  onClose: () => void;
}) {
  const t = useTranslations("adminCommon.viewer");
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  // A PDF can't be drawn as a picture: say so and offer to open it instead.
  const [broken, setBroken] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keyboard users land on the close button, and focus goes back to the thumbnail they pressed.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  function zoomTo(next: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setScale(clamped);
    if (clamped === ZOOM_MIN) setPos({ x: 0, y: 0 });
  }

  function toggleZoom() {
    zoomTo(scale > ZOOM_MIN ? ZOOM_MIN : 2.5);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomTo(scale - e.deltaY * 0.0015);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= ZOOM_MIN) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setPos({ x: dragStart.current.posX + (e.clientX - dragStart.current.x), y: dragStart.current.posY + (e.clientY - dragStart.current.y) });
  }
  function stopDrag() {
    dragging.current = false;
  }

  function touchDist(touches: React.TouchList) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: touchDist(e.touches), scale };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) toggleZoom();
      lastTap.current = now;
      if (scale > ZOOM_MIN) {
        dragging.current = true;
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, posX: pos.x, posY: pos.y };
      }
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current) {
      zoomTo(pinchStart.current.scale * (touchDist(e.touches) / pinchStart.current.dist));
    } else if (e.touches.length === 1 && dragging.current) {
      setPos({ x: dragStart.current.posX + (e.touches[0].clientX - dragStart.current.x), y: dragStart.current.posY + (e.touches[0].clientY - dragStart.current.y) });
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) dragging.current = false;
  }

  const roundBtn = "w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-lg leading-none";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="font-semibold break-words">{title}</p>
          {statusLabel && <span className={`inline-block mt-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${statusClass ?? ""}`}>{statusLabel}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" aria-label={t("zoomOut")} onClick={() => zoomTo(scale - 0.5)} className={roundBtn}>−</button>
          <button type="button" aria-label={t("zoomIn")} onClick={() => zoomTo(scale + 0.5)} className={roundBtn}>+</button>
          <button type="button" onClick={() => zoomTo(1)} className="px-3 h-10 rounded-full bg-white/10 hover:bg-white/25 text-xs font-semibold">{t("reset")}</button>
          <button type="button" ref={closeRef} aria-label={t("close")} onClick={onClose} className={`${roundBtn} focus-visible:outline-2 focus-visible:outline-white`}>✕</button>
        </div>
      </div>
      <div
        className="flex-1 overflow-hidden flex items-center justify-center touch-none select-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onDoubleClick={toggleZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {broken ? (
          <a href={src} target="_blank" rel="noopener noreferrer" className="rounded-xl gradient-brand px-5 py-3 text-sm font-bold text-white">
            {t("openFile")}
          </a>
        ) : (
          <img
            src={src}
            alt={title}
            draggable={false}
            onError={() => setBroken(true)}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, cursor: scale > 1 ? "grab" : "default" }}
            className="max-h-full max-w-full object-contain transition-transform duration-75"
          />
        )}
      </div>
      {!broken && <p className="px-4 pb-3 text-center text-xs text-white/60">{t("hint")}</p>}
    </div>
  );
}
