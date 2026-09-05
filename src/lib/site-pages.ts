export interface SitePageItem {
  title: string;
  description: string;
}

export interface SitePageContent {
  heading: string;
  tagline: string;
  body: string;
  itemsLabel: string;
  items: SitePageItem[];
  contactEmail: string;
  contactPhone: string;
}

export interface SitePageDef {
  slug: string;
  navLabel: string;
  path: string;
}

// The full set of editable footer pages -- slug is the DB key and admin
// route, path is where it's actually served publicly.
export const SITE_PAGES: SitePageDef[] = [
  { slug: "contact", navLabel: "Contact", path: "/contact" },
  { slug: "careers", navLabel: "Careers", path: "/careers" },
  { slug: "blog", navLabel: "Blog", path: "/blog" },
  { slug: "help-center", navLabel: "Help Center", path: "/help" },
  { slug: "exhibition-guide", navLabel: "Exhibition Guide", path: "/exhibition-guide" },
  { slug: "booth-setup-tips", navLabel: "Booth Setup Tips", path: "/booth-setup-tips" },
  { slug: "api-documentation", navLabel: "API Documentation", path: "/api-documentation" },
];

export function isValidSitePageSlug(slug: string): boolean {
  return SITE_PAGES.some((p) => p.slug === slug);
}

const EMPTY_CONTENT: SitePageContent = {
  heading: "",
  tagline: "",
  body: "",
  itemsLabel: "Details",
  items: [],
  contactEmail: "",
  contactPhone: "",
};

// Dummy placeholder content, keyed by slug, seeded on first install and
// used as a fallback if a row is ever missing.
export const DEFAULT_SITE_PAGE_CONTENT: Record<string, SitePageContent> = {
  contact: {
    heading: "Contact Us",
    tagline: "We'd love to hear from you — reach out with any question about exhibitions, bookings, or partnerships.",
    body: "Our team typically responds within one business day. For urgent matters during an active exhibition, please call the number below.",
    itemsLabel: "Departments",
    items: [
      { title: "Sales & Partnerships", description: "sales@theuniqueexpo.com" },
      { title: "Buyer Support", description: "support@theuniqueexpo.com" },
      { title: "Media & Press", description: "press@theuniqueexpo.com" },
    ],
    contactEmail: "info@theuniqueexpo.com",
    contactPhone: "+86 400 000 0000",
  },
  careers: {
    heading: "Careers at The Unique Expo",
    tagline: "Help us connect the world's buyers and exhibitors.",
    body: "We're a small, fast-moving team building the platform international buyers and exhibitors rely on for every trade fair visit. We're always interested in hearing from people who care about international trade, logistics, or building good software.",
    itemsLabel: "Open Positions",
    items: [
      { title: "Exhibition Account Manager — Shanghai", description: "Manage relationships with exhibitors and organizers across our China-based trade fairs." },
      { title: "Buyer Success Specialist — Remote", description: "Support international buyers through registration, sourcing, and on-site logistics." },
      { title: "Frontend Engineer — Remote", description: "Build and improve the platform buyers and exhibitors use every day." },
    ],
    contactEmail: "careers@theuniqueexpo.com",
    contactPhone: "",
  },
  blog: {
    heading: "The Unique Expo Blog",
    tagline: "Insights, guides, and updates from the world of B2B trade fairs.",
    body: "New posts from our team on exhibition prep, sourcing strategy, and what's changing across the industries we cover.",
    itemsLabel: "Recent Posts",
    items: [
      { title: "5 Tips for First-Time Exhibitors", description: "What to prepare before your first trade fair booth." },
      { title: "How to Prepare for CIFF Shanghai 2026", description: "A buyer's checklist for the furniture industry's biggest fair." },
      { title: "Understanding Trade Fair Visa Requirements", description: "A quick guide to visa support for international visitors." },
    ],
    contactEmail: "",
    contactPhone: "",
  },
  "help-center": {
    heading: "Help Center",
    tagline: "Answers to common questions about registration, bookings, and more.",
    body: "Can't find what you're looking for? Reach out to our support team and we'll get back to you.",
    itemsLabel: "Frequently Asked Questions",
    items: [
      { title: "How do I register for an exhibition?", description: "Visit the exhibition page and click \"Register as Buyer / Visitor\" — registration is required separately for each exhibition." },
      { title: "Can I reuse my documents across exhibitions?", description: "Yes — we prefill your details from your most recent registration, though you'll still need to submit a fresh registration per exhibition." },
      { title: "How do I book a hotel near the venue?", description: "Each exhibition page has a Hotels section with partner hotels near the venue." },
    ],
    contactEmail: "support@theuniqueexpo.com",
    contactPhone: "",
  },
  "exhibition-guide": {
    heading: "Exhibition Guide",
    tagline: "Everything you need to know before attending your first trade fair.",
    body: "Trade fairs move fast. A little preparation goes a long way toward making the most of your visit.",
    itemsLabel: "Steps to Get Ready",
    items: [
      { title: "1. Register Early", description: "Complete your buyer/visitor registration as soon as the exhibition opens for sign-ups." },
      { title: "2. Plan Your Visit", description: "Review the floor plan and shortlist exhibitors you want to meet." },
      { title: "3. Prepare Your Documents", description: "Have your passport, business card, and visa ready for registration and check-in." },
      { title: "4. Book Accommodation", description: "Reserve a hotel near the venue through our Hotels section." },
    ],
    contactEmail: "",
    contactPhone: "",
  },
  "booth-setup-tips": {
    heading: "Booth Setup Tips",
    tagline: "Practical advice for exhibitors setting up at a trade fair.",
    body: "A well-run booth is the difference between a busy floor and a quiet one. A few basics go a long way.",
    itemsLabel: "Tips",
    items: [
      { title: "Design for a 3-second impression", description: "Passersby decide whether to stop within seconds — keep your signage bold and simple." },
      { title: "Bring more business cards than you think", description: "Popular booths run out fast — overestimate." },
      { title: "Staff your booth in shifts", description: "Keep your team fresh across long exhibition days." },
    ],
    contactEmail: "",
    contactPhone: "",
  },
  "api-documentation": {
    heading: "API Documentation",
    tagline: "Reference for developers integrating with The Unique Expo platform.",
    body: "A quick overview of the public endpoints available today. This is a work in progress -- reach out if you need something not listed here.",
    itemsLabel: "Endpoints",
    items: [
      { title: "GET /api/exhibitions", description: "List all published exhibitions." },
      { title: "GET /api/exhibitions/{slug}", description: "Get details for a single exhibition." },
      { title: "POST /api/expo-registrations", description: "Submit a buyer/visitor registration for an exhibition (requires sign-in)." },
    ],
    contactEmail: "developers@theuniqueexpo.com",
    contactPhone: "",
  },
};

function isSitePageItem(value: unknown): value is SitePageItem {
  const record = value as Record<string, unknown> | null;
  return !!record && typeof record.title === "string" && typeof record.description === "string";
}

export function normalizeSitePageContent(slug: string, input: unknown): SitePageContent {
  const fallback = DEFAULT_SITE_PAGE_CONTENT[slug] || EMPTY_CONTENT;
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    heading: typeof record.heading === "string" ? record.heading : fallback.heading,
    tagline: typeof record.tagline === "string" ? record.tagline : fallback.tagline,
    body: typeof record.body === "string" ? record.body : fallback.body,
    itemsLabel: typeof record.itemsLabel === "string" ? record.itemsLabel : fallback.itemsLabel,
    items: Array.isArray(record.items)
      ? record.items.filter(isSitePageItem).map((i) => ({ title: i.title, description: i.description }))
      : fallback.items,
    contactEmail: typeof record.contactEmail === "string" ? record.contactEmail : fallback.contactEmail,
    contactPhone: typeof record.contactPhone === "string" ? record.contactPhone : fallback.contactPhone,
  };
}
