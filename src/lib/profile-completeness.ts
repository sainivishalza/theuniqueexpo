import { isPlaceholderEmail } from "@/lib/login-id";

// How much of what an exhibition's standard sign-up form takes from the buyer's profile is already filled in:
// the same details the registration screen would otherwise ask for. Safe in the browser and on the server.
// The keys are the names of the standard form's questions (messages: bulkRegister.core.<key>).

export const COMPLETENESS_ITEMS = [
  "gender", "nationality", "passportNumber", "phone", "companyName", "email",
  "docPassportFront", "docBusinessCard", "docVisaPage", "docBusinessLicense",
] as const;
export type CompletenessItem = (typeof COMPLETENESS_ITEMS)[number];

export interface ProfileForCompleteness {
  gender?: string;
  nationality?: string;
  passportNumber?: string;
  phoneNumber?: string;
  companyName?: string;
  contactEmail?: string;
  hasDocument?: Record<string, boolean>;
}

export interface Completeness {
  /** 0-100, whole number. */
  percent: number;
  missing: CompletenessItem[];
}

const filled = (v: string | undefined) => !!(v ?? "").trim();

export function profileCompleteness(profile: ProfileForCompleteness | null | undefined, accountEmail: string): Completeness {
  const p = profile ?? {};
  const has = p.hasDocument ?? {};
  const done: Record<CompletenessItem, boolean> = {
    gender: filled(p.gender),
    nationality: filled(p.nationality),
    passportNumber: filled(p.passportNumber),
    phone: filled(p.phoneNumber),
    companyName: filled(p.companyName),
    // An account with a real address already has one; otherwise the profile's contact e-mail counts.
    email: (!!accountEmail && !isPlaceholderEmail(accountEmail)) || filled(p.contactEmail),
    docPassportFront: !!has.passportFront,
    docBusinessCard: !!has.businessCard,
    docVisaPage: !!has.visaPage,
    docBusinessLicense: !!has.businessLicense,
  };
  const missing = COMPLETENESS_ITEMS.filter((k) => !done[k]);
  return { percent: Math.round(((COMPLETENESS_ITEMS.length - missing.length) / COMPLETENESS_ITEMS.length) * 100), missing };
}
