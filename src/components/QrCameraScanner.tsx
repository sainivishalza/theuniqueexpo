"use client";

import { useEffect, useRef, useState } from "react";
import { loadJsQr, readQr } from "@/lib/client/qr-frame";

interface NativeReader {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type NativeReaderConstructor = new (options: { formats: string[] }) => NativeReader;

const INTERVAL_MS = 150;
/** After this long without a code, the screen is asked to show a hint. */
const SLOW_AFTER_MS = 7000;

/** True when the browser can open a camera at all (it needs a secure page; the site is always served over https). */
export function cameraAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

// Opens the back camera and reports the first QR code it reads. It uses the phone's own QR reader where there is one
// (Chrome on Android) and otherwise a small reader written in JavaScript (iPhone Safari has none), which is loaded
// only when a camera is actually opened. Stops the camera when it is removed from the screen.
export default function QrCameraScanner({
  onScan,
  onError,
  label,
  accept,
  slowHint,
  className = "w-full max-w-sm rounded-lg bg-black",
}: {
  onScan: (text: string) => void;
  /** Codes that are not wanted (another kind of QR code in view) are ignored and the camera keeps looking. */
  accept?: (text: string) => boolean;
  /** "denied" = no permission, "failed" = no camera or it would not start */
  onError: (reason: "denied" | "failed") => void;
  label: string;
  /** Shown under the picture when nothing has been read for a few seconds (how to hold the phone). */
  slowHint?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [slow, setSlow] = useState(false);
  // The latest callbacks, so a parent that re-renders does not restart the camera.
  const handlers = useRef({ onScan, onError, accept });
  handlers.current = { onScan, onError, accept };

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        // A phone gives a small picture (640 x 480) unless it is asked for more, and a QR code on a screen or on paper is
        // read far less often from a small one.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const Native = (window as unknown as { BarcodeDetector?: NativeReaderConstructor }).BarcodeDetector;
        const native = Native ? new Native({ formats: ["qr_code"] }) : null;
        const jsQR = native ? null : await loadJsQr();
        const canvas = document.createElement("canvas");

        const tick = async () => {
          if (stopped) return;
          try {
            let text: string | null = null;
            if (native) {
              text = (await native.detect(video))[0]?.rawValue || null;
            } else if (jsQR) {
              text = readQr(jsQR, video, canvas, video.videoWidth, video.videoHeight);
            }
            if (text && !stopped && (handlers.current.accept?.(text) ?? true)) {
              stopped = true;
              handlers.current.onScan(text);
              return;
            }
          } catch {
            // a frame that cannot be read: try the next one
          }
          timer = setTimeout(tick, INTERVAL_MS);
        };
        tick();
      } catch (err) {
        if (stopped) return;
        const name = (err as { name?: string })?.name;
        handlers.current.onError(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed");
      }
    })();

    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);

    return () => {
      stopped = true;
      clearTimeout(slowTimer);
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <>
      <video ref={videoRef} playsInline muted aria-label={label} className={className} data-testid="qr-camera" />
      {slow && slowHint && <p role="status" className="mt-2 text-sm font-semibold text-amber-900" data-testid="qr-slow-hint">{slowHint}</p>}
    </>
  );
}
