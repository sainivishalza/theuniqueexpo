// Server-side validation for any base64 `data:` URL a client uploads
// (posters, gallery photos, logos, registration documents). The client's
// compressImage()/size checks in src/lib/client/image-upload.ts run in the
// browser and are trivially bypassed by POSTing straight to the API, so
// every write path that accepts one of these fields must re-validate here.

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // matches the client-side cap

const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+=*)$/i;
const DOCUMENT_DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/]+=*)$/i;

function decodedByteLength(base64: string): number {
  const padding = (base64.match(/=+$/)?.[0] ?? "").length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function isSizedDataUrl(value: string, re: RegExp, maxBytes: number): boolean {
  const match = re.exec(value);
  if (!match) return false;
  const base64 = match[match.length - 1];
  const bytes = decodedByteLength(base64);
  return bytes > 0 && bytes <= maxBytes;
}

// Blocks the obvious SSRF targets an admin-pasted image URL could point
// the Next.js Image Optimizer's server-side fetch at (localhost, cloud
// metadata endpoints, private/link-local ranges). This is a literal-IP/
// literal-hostname check only -- it does NOT protect against DNS
// rebinding (a hostname that resolves to a private IP only at fetch time),
// which would need the fetch itself to validate the resolved address, not
// this input-side check. Kept anyway as real, if partial, defense-in-depth
// against the common case of a compromised or careless admin pasting an
// obviously-internal URL.
const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?|\[?fe80:.*\]?|\[?fc[0-9a-f]{2}:.*\]?|\[?fd[0-9a-f]{2}:.*\]?)$/i;

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOSTNAME_RE.test(hostname);
}

// For admin-managed image fields (exhibition/tour/event/blog/team-member
// photos, company logo/favicon, about-page hero image) -- admins may either
// upload a file (a `data:image/...` URL) or paste a plain external image
// link, so both are accepted. Anything else (a non-image data: URL like
// `data:text/html`, an oversized payload, a `javascript:` URI, or a URL
// pointing at an internal address) is rejected.
export function isValidImageField(value: unknown, maxBytes = MAX_UPLOAD_BYTES): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("data:")) return isSizedDataUrl(value, IMAGE_DATA_URL_RE, maxBytes);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

export function isValidImageFieldArray(values: unknown, maxBytes = MAX_UPLOAD_BYTES): boolean {
  if (values === undefined || values === null) return true;
  if (!Array.isArray(values)) return false;
  return values.every((v) => isValidImageField(v, maxBytes));
}

// For self-service registration document uploads (passport, business
// license, custom "file" form answers) -- always a real upload, never a
// pasted link, and PDFs are legitimate here alongside images.
export function isValidUploadedDocument(value: unknown, maxBytes = MAX_UPLOAD_BYTES): boolean {
  if (typeof value !== "string" || value === "") return false;
  return isSizedDataUrl(value, DOCUMENT_DATA_URL_RE, maxBytes);
}

// Defense-in-depth for the image/gallery/photo-serving routes: even though
// isValidImageField() now blocks a non-image data: URL from ever being
// saved, these routes still echo whatever MIME type is embedded in a
// stored data: URL as the response's Content-Type. Re-checking it against
// an allowlist here means a route can never be tricked into serving
// something as text/html even if bad data reaches the column some other
// way (a pre-existing row from before this validation existed, a direct
// DB edit, a future bug elsewhere).
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isAllowedImageContentType(contentType: string): boolean {
  return ALLOWED_IMAGE_CONTENT_TYPES.has(contentType.toLowerCase());
}

// Videos are embedded via a real <iframe>, so the URL an admin pastes here
// becomes something every visitor's browser loads -- restrict it to the
// same hosts the CSP's frame-src allowlist covers (next.config.js), never
// an arbitrary URL that could otherwise frame an unrelated/malicious page.
const ALLOWED_EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
]);

export function isValidVideoEmbedUrl(value: unknown): boolean {
  if (typeof value !== "string" || value === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_EMBED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
