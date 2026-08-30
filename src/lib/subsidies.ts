export interface Subsidy {
  id: string;
  exhibitionSlug: string;
  exhibitionTitle: string;
  title: string;
  description: string;
  eligibility: string[];
  amount: string;
  deadline: string;
  status: "open" | "closing-soon" | "closed";
  documents: string[];
  howToApply: string[];
}

export const subsidies: Subsidy[] = [
  {
    id: "sub-1",
    exhibitionSlug: "ciftis-2026-beijing",
    exhibitionTitle: "CIFTIS 2026 Beijing",
    title: "CIFTIS Exhibitor Travel Subsidy",
    description:
      "Beijing municipal government offers travel subsidies to international exhibitors attending CIFTIS 2026. Covers partial airfare and hotel costs for qualified exhibitors.",
    eligibility: [
      "Registered exhibitor at CIFTIS 2026",
      "International company (non-mainland China)",
      "Minimum 9 sqm booth booking",
      "Completed exhibitor registration before July 31, 2026",
    ],
    amount: "Up to $800 USD per exhibitor (airfare + hotel)",
    deadline: "July 31, 2026",
    status: "open",
    documents: ["Exhibitor confirmation letter", "Flight booking receipt", "Hotel booking confirmation", "Company registration proof"],
    howToApply: [
      "Register as exhibitor at CIFTIS official website",
      "Book minimum 9 sqm booth space",
      "Submit travel subsidy application via CIFTIS portal",
      "Upload required documents (flight, hotel, company proof)",
      "Await approval (typically 2-3 weeks)",
      "Receive reimbursement after exhibition concludes",
    ],
  },
  {
    id: "sub-2",
    exhibitionSlug: "cioe-2026-shenzhen",
    exhibitionTitle: "CIOE 2026 Shenzhen",
    title: "CIOE Buyer Attendance Support",
    description:
      "Shenzhen convention bureau provides subsidies for qualified international buyers to attend CIOE 2026. Includes hotel accommodation and local transport vouchers.",
    eligibility: [
      "Pre-registered buyer at CIOE 2026",
      "Purchasing authority over $50,000 annually",
      "International company (non-mainland China)",
      "Attend minimum 2 matchmaking sessions",
    ],
    amount: "Up to $500 USD (hotel + transport vouchers)",
    deadline: "August 15, 2026",
    status: "open",
    documents: ["Buyer registration confirmation", "Company profile with purchasing authority", "Matchmaking session bookings", "Passport copy"],
    howToApply: [
      "Pre-register as buyer on CIOE website",
      "Book at least 2 B2B matchmaking sessions",
      "Submit buyer support application online",
      "Upload company profile and passport copy",
      "Receive voucher codes via email before event",
      "Redeem vouchers at designated hotels and transport partners",
    ],
  },
  {
    id: "sub-3",
    exhibitionSlug: "caexpo-2026-nanning",
    exhibitionTitle: "CAEXPO 2026 Nanning",
    title: "CAEXPO ASEAN Buyer Subsidy Program",
    description:
      "Special travel subsidy for ASEAN-country buyers attending CAEXPO 2026. Covers flight subsidies and accommodation in Nanning during the exhibition period.",
    eligibility: [
      "Nationality from ASEAN member state",
      "Pre-registered buyer at CAEXPO 2026",
      "Active business in trade/procurement sector",
      "Minimum 3-day attendance during exhibition",
    ],
    amount: "Up to $600 USD (flight subsidy + hotel)",
    deadline: "August 30, 2026",
    status: "open",
    documents: ["Passport (ASEAN nationality)", "CAEXPO buyer registration", "Business card / company letterhead", "Flight itinerary"],
    howToApply: [
      "Register as CAEXPO buyer online",
      "Select 'ASEAN Buyer Subsidy' during registration",
      "Upload passport scan and business documents",
      "Book hotel through CAEXPO partner hotels list",
      "Submit flight itinerary for subsidy calculation",
      "Receive subsidy confirmation and hotel voucher",
    ],
  },
  {
    id: "sub-4",
    exhibitionSlug: "5th-global-digital-trade-expo-2026",
    exhibitionTitle: "Global Digital Trade Expo 2026",
    title: "Digital Trade Expo Startup Travel Grant",
    description:
      "Hangzhou government provides travel grants for international startups and SMEs participating in the Digital Trade Expo. Supports early-stage companies in the digital trade ecosystem.",
    eligibility: [
      "Registered startup or SME (under 5 years old)",
      "Exhibiting at Digital Trade Expo innovation pavilion",
      "Annual revenue under $5M USD",
      "From outside mainland China",
    ],
    amount: "Up to $1,000 USD (flight + hotel + booth subsidy)",
    deadline: "September 1, 2026",
    status: "open",
    documents: ["Startup registration certificate", "Innovation pavilion exhibitor confirmation", "Revenue declaration", "Flight & hotel bookings"],
    howToApply: [
      "Apply for Innovation Pavilion booth at expo website",
      "Submit startup travel grant application",
      "Provide business registration and revenue docs",
      "Upload flight and hotel booking confirmations",
      "Await review by Hangzhou trade bureau (1-2 weeks)",
      "Receive grant disbursement after exhibition",
    ],
  },
  {
    id: "sub-5",
    exhibitionSlug: "global-ocean-city-food-expo-2026",
    exhibitionTitle: "Global Ocean City Food Expo 2026",
    title: "Xiamen Food Expo Exhibitor Support",
    description:
      "Xiamen municipal government supports international food and beverage exhibitors with venue discounts, hotel subsidies, and local transport passes.",
    eligibility: [
      "Registered exhibitor at Global Ocean City Food Expo",
      "International F&B company",
      "Minimum 6 sqm booth booking",
      "Display products in food/beverage category",
    ],
    amount: "Up to $400 USD (hotel + local transport)",
    deadline: "March 1, 2026",
    status: "closed",
    documents: ["Exhibitor badge", "Hotel booking confirmation", "Booth booking receipt", "Product category certificate"],
    howToApply: [
      "Register as exhibitor at food expo website",
      "Book minimum 6 sqm booth space",
      "Submit exhibitor support application",
      "Upload required documents",
      "Receive support package confirmation",
      "Redeem at designated hotels and transport partners",
    ],
  },
];

export function getSubsidiesByExhibition(slug: string): Subsidy[] {
  return subsidies.filter((s) => s.exhibitionSlug === slug);
}

export function getOpenSubsidies(): Subsidy[] {
  return subsidies.filter((s) => s.status !== "closed");
}
