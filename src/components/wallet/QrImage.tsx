"use client";

import { useEffect, useState } from "react";

// Draws a QR code for `value`. The picture is made in the browser (nothing is sent anywhere).
export default function QrImage({ value, size = 220, alt }: { value: string; size?: number; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let stale = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(value, { width: size * 3, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => !stale && setSrc(url))
      .catch(() => !stale && setSrc(""));
    return () => {
      stale = true;
    };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className="rounded-lg bg-gray-100" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className="rounded-lg border border-gray-200 bg-white" />;
}
