export type RegistrationType = "buyer" | "visitor";
export type Gender = "male" | "female";

export const NATIONALITIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bahrain", "Bangladesh",
  "Belgium", "Brazil", "Bulgaria", "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Czech Republic", "Denmark", "Egypt", "Ethiopia", "Finland", "France", "Germany", "Ghana",
  "Greece", "Hong Kong", "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Ivory Coast", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Lebanon", "Libya", "Malaysia",
  "Mexico", "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman",
  "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia",
  "Senegal", "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uzbekistan", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe", "Other",
] as const;

export const COMPANY_TYPES = [
  "Importer",
  "Exporter",
  "Wholesaler",
  "Retailer",
  "Distributor",
  "Manufacturer",
  "Other",
] as const;

export const COMPANY_SCALES = ["0-10", "11-20", "21-50", "50-100", "Above 100"] as const;

export const PURPOSES_OF_VISIT = [
  "Finding New Suppliers / Distributors",
  "Collecting Market Information",
  "Consolidating Links With Suppliers / Partners",
  "Finding New Products",
  "Placing an Order",
] as const;

export const INFO_SOURCES = ["Ana", "Derek", "Tahir", "Other"] as const;

export const EXPORTING_MARKETS = [
  "Europe",
  "Africa",
  "Middle East",
  "Asia Pacific",
  "North America",
  "Latin America",
  "Other",
] as const;

export interface ExpoRegistrationInput {
  exhibitionId: number;
  registrationType: RegistrationType;
  gender: Gender;
  fullName: string;
  nationality: string;
  passportNumber: string;
  companyName: string;
  companyWebsite: string;
  phone: string;
  email: string;
  companyType: string;
  companyTypeOther: string;
  companyScale: string;
  companyIntro: string;
  purposeOfVisit: string;
  infoSource: string;
  infoSourceOther: string;
  exportingMarkets: string[];
  exportingMarketOther: string;
  docPassportFront: string;
  docBusinessCard: string;
  docVisaPage: string;
  docBusinessLicense: string;
  docOrderList: string;
}

export interface ExpoRegistration extends ExpoRegistrationInput {
  id: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const REQUIRED_TEXT_FIELDS: { field: keyof ExpoRegistrationInput; label: string }[] = [
  { field: "registrationType", label: "Registration type (Buyer/Visitor)" },
  { field: "gender", label: "Gender" },
  { field: "fullName", label: "Full name" },
  { field: "nationality", label: "Nationality" },
  { field: "passportNumber", label: "Passport number" },
  { field: "companyName", label: "Company name" },
  { field: "phone", label: "Phone number" },
  { field: "email", label: "Email" },
  { field: "companyType", label: "Company type" },
  { field: "companyScale", label: "Company scale" },
  { field: "purposeOfVisit", label: "Purpose of visit" },
  { field: "infoSource", label: "Where you heard about this event" },
];

const REQUIRED_DOCUMENT_FIELDS: { field: keyof ExpoRegistrationInput; label: string }[] = [
  { field: "docPassportFront", label: "Passport front page" },
  { field: "docBusinessCard", label: "Business card" },
  { field: "docVisaPage", label: "Visa page" },
  { field: "docBusinessLicense", label: "Business license" },
];

export function validateExpoRegistration(input: Partial<ExpoRegistrationInput>): string | null {
  for (const { field, label } of REQUIRED_TEXT_FIELDS) {
    if (!input[field] || String(input[field]).trim() === "") {
      return `Please fill in: ${label}`;
    }
  }
  if (input.companyType === "Other" && !input.companyTypeOther?.trim()) {
    return "Please specify your company nature";
  }
  if (input.infoSource === "Other" && !input.infoSourceOther?.trim()) {
    return "Please specify how you heard about this event";
  }
  if (!input.exportingMarkets || input.exportingMarkets.length === 0) {
    return "Please select at least one exporting market";
  }
  if (input.exportingMarkets.includes("Other") && !input.exportingMarketOther?.trim()) {
    return "Please specify your exporting market";
  }
  for (const { field, label } of REQUIRED_DOCUMENT_FIELDS) {
    if (!input[field] || String(input[field]).trim() === "") {
      return `Please upload: ${label}`;
    }
  }
  return null;
}
