// Ways a buyer can sign in besides an email address: the phone number or the
// passport number on their profile. People imported from expo sheets often
// have no email, so they log in with one of these instead (and the account
// keeps a placeholder email that can never receive mail).

export const PLACEHOLDER_EMAIL_DOMAIN = "noemail.invalid";

// Digits only; "(+86)138 0000 0000" and "0086 138 0000 0000" both become
// 13800000000. Returns "" if there are too few digits to be a phone number.
export function normalizeLoginPhone(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0086") && digits.length > 11) digits = digits.slice(4);
  else if (digits.startsWith("86") && digits.length === 13) digits = digits.slice(2);
  return digits.length >= 8 ? digits : "";
}

// Upper-case, no spaces or hyphens: "ar 8800-292" -> "AR8800292".
export function normalizePassportNumber(input: string): string {
  const value = (input || "").replace(/[\s\-.]/g, "").toUpperCase();
  return value.length >= 6 && /^[A-Z0-9]+$/.test(value) ? value : "";
}

export function placeholderEmail(kind: "phone" | "passport", value: string): string {
  return `${kind}-${value.toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}
