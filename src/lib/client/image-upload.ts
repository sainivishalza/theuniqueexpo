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
