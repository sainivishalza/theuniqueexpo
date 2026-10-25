"use client";

import { useEffect, useRef } from "react";

interface NativeReader {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type NativeReaderConstructor = new (options: { formats: string[] }) => NativeReader;

const MAX_WIDTH = 800;
const INTERVAL_MS = 150;

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
  className = "w-full max-w-sm rounded-lg bg-black",
}: {
  onScan: (text: string) => void;
  /** Codes that are not wanted (another kind of QR code in view) are ignored and the camera keeps looking. */
  accept?: (text: string) => boolean;
  /** "denied" = no permission, "failed" = no camera or it would not start */
  onError: (reason: "denied" | "failed") => void;
  label: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The latest callbacks, so a parent that re-renders does not restart the camera.
  const handlers = useRef({ onScan, onError, accept });
  handlers.current = { onScan, onError, accept };

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
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
        const jsQR = native ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const tick = async () => {
          if (stopped) return;
          try {
            let text: string | null = null;
            if (native) {
              text = (await native.detect(video))[0]?.rawValue || null;
            } else if (jsQR && ctx && video.videoWidth > 0) {
              const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })?.data || null;
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

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return <video ref={videoRef} playsInline muted aria-label={label} className={className} data-testid="qr-camera" />;
}
