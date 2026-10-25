// What a scanned e-ticket QR code holds is the link to the check page ("…/admin/ticket-check?code=ABC"); a bare code works too.
// Returns the code, or "" when the scan holds nothing usable.
export function ticketCodeFromScan(text: string): string {
  const raw = text.trim().slice(0, 300);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const code = url.searchParams.get("code");
    if (code) return code.trim();
    return "";
  } catch {
    return raw;
  }
}
