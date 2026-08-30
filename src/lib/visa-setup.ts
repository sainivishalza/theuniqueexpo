export interface VisaService {
  id: string;
  type: "company-setup" | "visa" | "moving" | "consultation";
  title: string;
  description: string;
  features: string[];
  process: { step: number; title: string; description: string; duration: string }[];
  pricing: string;
  estimatedTime: string;
  image: string;
}

export interface VisaApplication {
  id: string;
  serviceId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  nationality: string;
  serviceType: string;
  details: string;
  status: "pending" | "in-progress" | "completed" | "rejected";
  createdAt: string;
}

const visaApplications: VisaApplication[] = [];

export function getVisaApplications(): VisaApplication[] {
  return visaApplications;
}

export function submitVisaApplication(
  app: Omit<VisaApplication, "id" | "status" | "createdAt">
): VisaApplication {
  const newApp: VisaApplication = {
    ...app,
    id: `va-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  visaApplications.push(newApp);
  return newApp;
}

export const visaServices: VisaService[] = [
  {
    id: "company-setup",
    type: "company-setup",
    title: "Company Registration in China",
    description:
      "Full-service company registration including WFOE, Joint Venture, or Representative Office setup. We handle all paperwork, government filings, and bank account opening.",
    features: [
      "WFOE (Wholly Foreign-Owned Enterprise) registration",
      "Joint Venture setup with Chinese partners",
      "Representative Office registration",
      "Business license acquisition",
      "Company seal (chop) manufacturing",
      "Bank account opening (ICBC, BOC, etc.)",
      "Tax registration & social insurance setup",
      "Annual compliance & filing support",
    ],
    process: [
      { step: 1, title: "Consultation", description: "Discuss business needs, choose entity type, select city", duration: "1-2 days" },
      { step: 2, title: "Document Prep", description: "Prepare all required documents, notarization, and translations", duration: "3-5 days" },
      { step: 3, title: "Government Filing", description: "Submit application to AIC (Administration for Industry & Commerce)", duration: "5-10 days" },
      { step: 4, title: "License Issuance", description: "Receive business license, organization code, tax certificate", duration: "2-3 days" },
      { step: 5, title: "Post-Registration", description: "Bank account, company seal, tax registration, social insurance", duration: "5-7 days" },
    ],
    pricing: "From $5,000 USD (varies by city and entity type)",
    estimatedTime: "3-4 weeks total",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop&q=80",
  },
  {
    id: "visa-support",
    type: "visa",
    title: "Visa Application Support",
    description:
      "Expert assistance with all types of Chinese visas — business (M-visa), work (Z-visa), student (X-visa), and tourist (L-visa). We ensure highest approval rates.",
    features: [
      "Business visa (M-visa) for trade activities",
      "Work permit & Z-visa for employment",
      "Student visa (X1/X2) support",
      "Tourist visa (L-visa) assistance",
      "Visa extension & renewal",
      "Invitation letter processing",
      "Document preparation & review",
      "Embassy appointment scheduling",
    ],
    process: [
      { step: 1, title: "Assessment", description: "Evaluate visa type needed based on purpose and duration", duration: "1 day" },
      { step: 2, title: "Document Collection", description: "Gather passport, photos, invitation letter, financial proof", duration: "2-3 days" },
      { step: 3, title: "Application Filing", description: "Complete application forms, submit to embassy/consulate", duration: "1-2 days" },
      { step: 4, title: "Processing", description: "Monitor application status, respond to any queries", duration: "5-10 days" },
      { step: 5, title: "Visa Issuance", description: "Collect visa, verify details, provide travel guidance", duration: "1-2 days" },
    ],
    pricing: "From $200 USD per application",
    estimatedTime: "1-2 weeks",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=500&fit=crop&q=80",
  },
  {
    id: "moving-support",
    type: "moving",
    title: "Business & Personal Relocation",
    description:
      "Comprehensive moving assistance for businesses relocating to China and individuals relocating internationally. We handle everything from freight to settling in.",
    features: [
      "International freight forwarding (sea, air, land)",
      "Customs clearance & import documentation",
      "Office relocation project management",
      "Residential moving & unpacking",
      "Temporary storage (short & long term)",
      "Comprehensive insurance coverage",
      "Settling-in services (bank, SIM, housing search)",
      "Pet relocation assistance",
    ],
    process: [
      { step: 1, title: "Survey", description: "Inventory assessment, volume estimation, timeline planning", duration: "1-2 days" },
      { step: 2, title: "Quotation", description: "Detailed cost breakdown with insurance options", duration: "2-3 days" },
      { step: 3, title: "Packing & Export", description: "Professional packing, customs documentation, loading", duration: "3-5 days" },
      { step: 4, title: "Shipping", description: "Transport via sea/air, tracking updates provided", duration: "2-6 weeks" },
      { step: 5, title: "Import & Delivery", description: "Customs clearance, delivery, unpacking, setup", duration: "3-5 days" },
    ],
    pricing: "Custom quote based on volume and destination",
    estimatedTime: "3-8 weeks (depending on mode)",
    image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&h=500&fit=crop&q=80",
  },
  {
    id: "china-consultation",
    type: "consultation",
    title: "China Business Consultation",
    description:
      "One-on-one expert sessions covering market entry strategy, supplier sourcing, legal compliance, cultural guidance, and trade regulations for doing business in China.",
    features: [
      "Market entry strategy & competitor analysis",
      "Supplier sourcing & factory verification",
      "Product sourcing & quality inspection",
      "Legal & regulatory compliance guidance",
      "Cultural etiquette & negotiation coaching",
      "Trade compliance & customs advisory",
      "Intellectual property protection strategy",
      "Ongoing advisory retainer packages",
    ],
    process: [
      { step: 1, title: "Discovery Call", description: "Free 15-minute call to understand your needs", duration: "15 min" },
      { step: 2, title: "Preparation", description: "Research your industry, market, and specific challenges", duration: "1-2 days" },
      { step: 3, title: "Consultation Session", description: "60-90 minute deep-dive session via video call", duration: "60-90 min" },
      { step: 4, title: "Action Plan", description: "Receive written summary with actionable recommendations", duration: "1-2 days" },
      { step: 5, title: "Follow-up", description: "Optional follow-up sessions and ongoing support", duration: "Ongoing" },
    ],
    pricing: "From $150 USD per session / $500 for package of 4",
    estimatedTime: "1-3 days from booking",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop&q=80",
  },
];

export function getVisaServiceById(id: string): VisaService | undefined {
  return visaServices.find((s) => s.id === id);
}
