// Shared by any client component that turns a picked File into a data URL
// for upload (exhibition photos, registration documents). A raw phone-camera
// photo (often several MB) turns into an even bigger base64 string once
// embedded in a JSON submission -- downscale and re-encode as JPEG first so
// uploads stay fast, since the receiving end only needs a legible image, not
// full camera resolution.
export function compressImage(file: File, maxDimension = 1600, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't load image"));
    };
    img.src = objectUrl;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Non-image files (e.g. PDFs) can't be recompressed via canvas, so they go
// through as-is.
export async function readDocumentAsDataUrl(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    try {
      return await compressImage(file);
    } catch {
      return readFileAsDataUrl(file);
    }
  }
  return readFileAsDataUrl(file);
}

// Same shrinking as compressImage(), but the picture is read through a data URL rather
// than a blob: URL. The site's Content-Security-Policy allows data: images and not
// blob: ones, so compressImage() fails in the browser and its callers fall back to the
// untouched file. Used by the rewards wallet, where a payment proof or QR code from a
// phone camera can be several MB.
export async function compressImageViaDataUrl(file: File, maxDimension = 1800, quality = 0.8): Promise<string> {
  const source = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      // JPEG has no transparency: paint white first so a transparent PNG does not turn black.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Couldn't load image"));
    img.src = source;
  });
}
