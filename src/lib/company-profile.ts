export interface CompanyProfile {
  legalName: string;
  logoUrl: string;
  contactEmail: string;
  phone: string;
  addressLine: string;
  addressCity: string;
  addressCountry: string;
  socialLinkedIn: string;
  socialFacebook: string;
  socialInstagram: string;
  socialX: string;
  socialYoutube: string;
}

// Used if the table hasn't been seeded yet (the migration seeds a row, but
// this keeps the page/admin form from crashing either way). Contact fields
// start empty rather than guessed -- a wrong phone/address is worse than a
// missing one, and NAP consistency (matching Google Business Profile,
// LinkedIn, etc.) only works if what's here is real.
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  legalName: "The Unique Expo",
  logoUrl: "",
  contactEmail: "info@theuniqueexpo.com",
  phone: "",
  addressLine: "",
  addressCity: "",
  addressCountry: "",
  socialLinkedIn: "",
  socialFacebook: "",
  socialInstagram: "",
  socialX: "",
  socialYoutube: "",
};

export function normalizeCompanyProfile(input: unknown): CompanyProfile {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (key: keyof CompanyProfile) => (typeof record[key] === "string" ? (record[key] as string) : DEFAULT_COMPANY_PROFILE[key]);
  return {
    legalName: str("legalName"),
    logoUrl: str("logoUrl"),
    contactEmail: str("contactEmail"),
    phone: str("phone"),
    addressLine: str("addressLine"),
    addressCity: str("addressCity"),
    addressCountry: str("addressCountry"),
    socialLinkedIn: str("socialLinkedIn"),
    socialFacebook: str("socialFacebook"),
    socialInstagram: str("socialInstagram"),
    socialX: str("socialX"),
    socialYoutube: str("socialYoutube"),
  };
}

export function companyProfileSocialLinks(profile: CompanyProfile): { label: string; icon: string; url: string }[] {
  return [
    { label: "X", icon: "X", url: profile.socialX },
    { label: "LinkedIn", icon: "in", url: profile.socialLinkedIn },
    { label: "Facebook", icon: "f", url: profile.socialFacebook },
    { label: "Instagram", icon: "IG", url: profile.socialInstagram },
    { label: "YouTube", icon: "▶", url: profile.socialYoutube },
  ].filter((s) => s.url);
}
