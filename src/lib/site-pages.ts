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
  { slug: "help-center", navLabel: "Help Center", path: "/help" },
  { slug: "exhibition-guide", navLabel: "Exhibition Guide", path: "/exhibition-guide" },
  { slug: "booth-setup-tips", navLabel: "Booth Setup Tips", path: "/booth-setup-tips" },
  { slug: "api-documentation", navLabel: "API Documentation", path: "/api-documentation" },
  { slug: "privacy-policy", navLabel: "Privacy Policy", path: "/privacy" },
  { slug: "terms-of-service", navLabel: "Terms of Service", path: "/terms" },
  { slug: "cookie-policy", navLabel: "Cookie Policy", path: "/cookies" },
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
  "privacy-policy": {
    heading: "Privacy Policy",
    tagline: "How The Unique Expo collects, uses, and protects your information.",
    body: `Last updated: 2026. This policy explains what information The Unique Expo ("we", "us") collects when you use our platform, how we use it, and the choices you have.

1. Information We Collect. Account information: name, email address, and password (stored as a one-way hash, never in plain text) when you register. Registration documents: when you register for a specific exhibition, we may collect a passport photo page, business card, visa page, business license, and/or order list, as required by that exhibition's organizer. Business and marketplace data: RFQ (request for quote) details, quotes, prices, lead times, and messages you exchange with other users through the platform. Usage data: pages visited and general interaction data, collected via Google Analytics where enabled.

2. How We Use Your Information. To create and manage your account, to process exhibition, tour, and hotel registrations, to connect buyers with exhibitors through the RFQ marketplace, to communicate with you about your registrations and quotes, and to improve the platform's content and performance.

3. Sharing With Third Parties. Registration documents you submit for a specific exhibition are shared with that exhibition's organizer, as required to process your registration -- we do not share them with unrelated third parties. RFQ details and quotes are visible to other users of the marketplace as part of its normal, transparent operation. We do not sell your personal information. We may share information with service providers who help us operate the platform (e.g. hosting, analytics), bound to use it only for that purpose.

4. Data Retention and Security. Passwords are hashed with bcrypt and never stored or transmitted in plain text. We retain account and registration data for as long as your account is active, or as required to fulfill a specific exhibition registration, plus any period required by law. You may request deletion of your account and associated data at any time (see Section 5).

5. Your Rights. You may request access to, correction of, or deletion of your personal information by emailing the address below. We will respond within a reasonable time, subject to any documents we are required to retain for a specific exhibition organizer or by law.

6. Cookies. We use a small number of cookies, described in our Cookie Policy.

7. Changes to This Policy. We may update this policy from time to time; material changes will be reflected by an updated "Last updated" date above.

8. Contact. Questions about this policy can be sent to the email address below.`,
    itemsLabel: "",
    items: [],
    contactEmail: "privacy@theuniqueexpo.com",
    contactPhone: "",
  },
  "terms-of-service": {
    heading: "Terms of Service",
    tagline: "The terms that govern your use of The Unique Expo platform.",
    body: `Last updated: 2026. By creating an account or using The Unique Expo ("we", "us", "the platform"), you agree to these terms.

1. What We Are. The Unique Expo is a platform that helps buyers and exhibitors discover trade fairs and exhibitions, register for them, request and submit quotes through our RFQ marketplace, and arrange related services such as business tours, hotel bookings, visa setup, and relocation assistance. We are not the organizer of any exhibition listed on the platform, not a travel agency, and not a visa-issuing authority -- we facilitate connections and registrations on behalf of the relevant organizers and providers.

2. Accounts. You must provide accurate information when creating an account and registering for exhibitions or services. You are responsible for maintaining the confidentiality of your password and for all activity under your account.

3. Acceptable Use. You agree not to use the platform to submit false information, impersonate another person or business, scrape or bulk-harvest data beyond normal use, or interfere with the platform's operation or other users' use of it.

4. The RFQ Marketplace. Requests for quotes, quotes, prices, and lead times submitted by buyers and exhibitors are user-generated content. We do not verify the accuracy of quotes or the ability of any party to fulfill them, and we are not a party to any agreement reached between a buyer and an exhibitor.

5. Registrations and Fees. Submitting a registration through the platform does not guarantee acceptance by the relevant exhibition organizer. Fees for exhibition registration, tours, hotel bookings, visa services, or other paid services are set by the relevant organizer or service provider and, unless stated otherwise at the time of booking, are arranged and collected directly between you and that organizer or provider.

6. Intellectual Property. The platform's design, code, and content (excluding user-submitted content and exhibitor/organizer-provided material) belong to The Unique Expo. You retain ownership of content you submit, and grant us a license to display it as needed to operate the platform.

7. Disclaimer and Limitation of Liability. The platform is provided "as is." We are not liable for the accuracy of exhibitor-provided or user-submitted information, for the actions of exhibition organizers or third-party service providers, or for indirect or consequential damages arising from your use of the platform, to the maximum extent permitted by law.

8. Termination. We may suspend or terminate an account that violates these terms. You may stop using the platform and request account deletion at any time.

9. Changes to These Terms. We may update these terms from time to time; continued use of the platform after an update constitutes acceptance of the revised terms.

10. Contact. Questions about these terms can be sent to the email address below.`,
    itemsLabel: "",
    items: [],
    contactEmail: "legal@theuniqueexpo.com",
    contactPhone: "",
  },
  "cookie-policy": {
    heading: "Cookie Policy",
    tagline: "What cookies we use and why.",
    body: `Last updated: 2026. This policy explains how The Unique Expo uses cookies and similar technologies.

1. What Are Cookies. Cookies are small text files stored in your browser that let a website remember information between visits.

2. Essential Cookies. We use a single essential cookie ("token") to keep you signed in after you log in. This cookie is required for the platform to function -- it cannot be disabled without also disabling sign-in.

3. Analytics Cookies. Where enabled, we use Google Analytics to understand how visitors use the platform (pages viewed, general navigation patterns), which sets its own cookies. This is optional and can be blocked using your browser's privacy settings or an ad-blocking extension without affecting your ability to use the platform.

4. Cookies We Do Not Use. We do not use third-party advertising or cross-site tracking cookies.

5. Managing Cookies. Most browsers let you view, delete, and block cookies through their settings. Blocking the essential "token" cookie will prevent you from staying signed in.

6. Changes to This Policy. We may update this policy from time to time; material changes will be reflected by an updated "Last updated" date above.

7. Contact. Questions about this policy can be sent to the email address below.`,
    itemsLabel: "",
    items: [],
    contactEmail: "privacy@theuniqueexpo.com",
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
