"use client";

import { useId, useState } from "react";
import { compressImageViaDataUrl, readFileAsDataUrl } from "@/lib/client/image-upload";

// A "choose a picture" field that turns the file into a data URL for upload. Images are
// shrunk first (a phone photo can be many MB); `allowPdf` also takes a PDF as it is.
// `high` keeps QR codes sharp enough to scan.
export default function UploadField({
  label,
  value,
  onChange,
  onError,
  allowPdf = false,
  high = false,
  required = false,
  invalidMessage,
  removeLabel,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  onError: (message: string) => void;
  allowPdf?: boolean;
  high?: boolean;
  required?: boolean;
  invalidMessage: string;
  removeLabel: string;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (!isImage && !(allowPdf && file.type === "application/pdf")) {
      onError(invalidMessage);
      return;
    }
    setBusy(true);
    try {
      // If the picture can't be re-drawn (an odd format), send the original file.
      const url = isImage ? await compressImageViaDataUrl(file, 1800, high ? 0.92 : 0.78).catch(() => readFileAsDataUrl(file)) : await readFileAsDataUrl(file);
      onChange(url);
    } catch {
      onError(invalidMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        id={id}
        type="file"
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        required={required && !value}
        disabled={busy}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      {value && (
        <div className="mt-2 flex items-center gap-3">
          {value.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
          ) : (
            <span className="text-2xl" aria-hidden="true">📄</span>
          )}
          <button type="button" onClick={() => onChange("")} className="text-sm font-semibold text-red-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 rounded-sm">
            {removeLabel}
          </button>
        </div>
      )}
    </div>
  );
}
