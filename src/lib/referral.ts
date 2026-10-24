// Referral programme: rules and checks shared by the screens and the server. Nothing here touches the database.
//
// A buyer shares a personal link; when the person who signs up through it does what the admin chose (the "trigger"),
// the buyer who invited them and the new buyer can each receive reward points. Every number below is edited by an
// admin in Rewards wallet -> Referrals.

export type ReferralTrigger = "signup" | "approved" | "attended";

// In the order things happen to a new buyer: signing up, then a registration being approved, then really attending.
export const REFERRAL_TRIGGERS: ReferralTrigger[] = ["signup", "approved", "attended"];

export interface ReferralSettings {
  enabled: boolean;
  trigger: ReferralTrigger;
  referrerPoints: number; // for the buyer who invited (0 = none)
  referredPoints: number; // for the new buyer (0 = none)
  maxPerReferrer: number; // how many paid referrals one buyer can have (0 = no limit)
}

export const REFERRAL_POINTS_MAX = 100_000;
export const REFERRAL_CAP_MAX = 10_000;

// Off until an admin switches it on; the numbers are only a starting point.
export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  enabled: false,
  trigger: "attended",
  referrerPoints: 50,
  referredPoints: 20,
  maxPerReferrer: 20,
};

export function triggerRank(trigger: ReferralTrigger): number {
  return REFERRAL_TRIGGERS.indexOf(trigger);
}

function whole(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

// The settings an admin sent, or null when anything is missing or out of range.
export function parseReferralSettings(body: unknown): ReferralSettings | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const referrerPoints = whole(b.referrerPoints, 0, REFERRAL_POINTS_MAX);
  const referredPoints = whole(b.referredPoints, 0, REFERRAL_POINTS_MAX);
  const maxPerReferrer = whole(b.maxPerReferrer, 0, REFERRAL_CAP_MAX);
  if (referrerPoints === null || referredPoints === null || maxPerReferrer === null) return null;
  if (typeof b.enabled !== "boolean" || !REFERRAL_TRIGGERS.includes(b.trigger as ReferralTrigger)) return null;
  // Switched on with nothing to pay would only collect invitations that never reward anyone.
  if (b.enabled && referrerPoints === 0 && referredPoints === 0) return null;
  return { enabled: b.enabled, trigger: b.trigger as ReferralTrigger, referrerPoints, referredPoints, maxPerReferrer };
}

export type ReferralStatus = "pending" | "rewarded" | "rejected";

// Invitation codes: 10 characters, no look-alikes (0/O, 1/I/L).
export const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const REFERRAL_CODE_LENGTH = 10;

export function isValidReferralCode(value: unknown): value is string {
  return typeof value === "string" && /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/.test(value);
}

// Points one exhibition pays for a referral, in place of the programme's default (null = use the default, 0 = none).
export interface ExhibitionReferralPoints {
  referrerPoints: number | null;
  referredPoints: number | null;
}

export function parseExhibitionReferralPoints(body: unknown): ExhibitionReferralPoints | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const one = (v: unknown): number | null | undefined => (v === null ? null : whole(v, 0, REFERRAL_POINTS_MAX) ?? undefined);
  const referrerPoints = one(b.referrerPoints);
  const referredPoints = one(b.referredPoints);
  return referrerPoints === undefined || referredPoints === undefined ? null : { referrerPoints, referredPoints };
}

// What to pay for a referral completed at an exhibition: its own numbers where it has them, the default for the rest.
export function referralRates(settings: ReferralSettings, own?: Partial<ExhibitionReferralPoints> | null): { referrerPoints: number; referredPoints: number } {
  return {
    referrerPoints: own?.referrerPoints ?? settings.referrerPoints,
    referredPoints: own?.referredPoints ?? settings.referredPoints,
  };
}
