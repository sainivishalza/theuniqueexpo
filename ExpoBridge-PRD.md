# Product Requirements Document
## ExpoBridge — Global B2B Exhibition, Trade & Sourcing Platform

**Document type:** Product Requirements Document (PRD)
**Version:** 1.0 (Draft for stakeholder review)
**Date:** August 29, 2026
**Prepared for:** Founding team / Product / Engineering / Design / Investors

> **A note on this document:** "ExpoBridge" is a placeholder working name used throughout this PRD so it reads as a real spec instead of a list of blanks. Swap in your own brand name, logo, colors, and copy before development — and run a trademark check on whatever name you choose. This PRD defines an **original product** for the B2B exhibition, trade-fair, and cross-border sourcing industry — the same market category as established players in this space — with its own visual identity, information architecture, and an expanded feature set. It is not a copy of any specific company's code, design, or content.

---

### Table of Contents
1. Executive Summary
2. Market & Business Context
3. Goals & Success Criteria
4. Differentiation Strategy
5. Target Users & Personas
6. Scope: MVP vs. Future Phases
7. Information Architecture / Sitemap
8. Feature Requirements (Core Modules)
9. Key User Flows
10. Non-Functional Requirements
11. Technical Architecture & Recommended Stack
12. Design Direction
13. Monetization Model & Pricing
14. Success Metrics (KPIs)
15. Roadmap & Phasing
16. Risks, Assumptions & Dependencies
17. Open Questions for Stakeholder Input
18. Glossary

---

## 1. Executive Summary

ExpoBridge is a digital-first platform for the B2B exhibition and trade-fair industry: a company that plans and operates physical trade exhibitions across one or more industries, then layers a digital product on top that connects international buyers with exhibitors, handles event logistics (hotel/travel), publishes trade media (magazine + video), and runs a partner/agent network to source buyers and exhibitors globally.

The product goal is to take a business model that, across most incumbents in this category, still runs on slow multi-step registration forms, static exhibitor directories, and manual matchmaking — and rebuild it around three pillars: **(1)** registration and onboarding fast enough to complete on a phone in under a minute, **(2)** AI-assisted matchmaking and search that replace manual browsing, and **(3)** a hybrid physical + virtual event experience so buyers who can't travel can still participate and convert. The core revenue modules — exhibitor services, procurement/RFQ marketplace, hotel & travel booking, content media, and a partner commission program — stay the same, because they're what make this business model work. What changes is the design, the speed, and the depth of automation.

## 2. Market & Business Context

**Industry category:** B2B trade exhibitions and MICE (Meetings, Incentives, Conferences, Exhibitions), combined with a digital buyer-sourcing marketplace.

**How this business model typically works:**
- An organizer runs recurring trade exhibitions (often industry-specific — furniture, electronics, building materials, beauty, machinery, etc.) in convention centers, usually multiple times a year across different host cities.
- Exhibitors (manufacturers, brands, trading companies) pay for booth space and promotional packages to meet buyers face-to-face.
- International buyers and sourcing agents are recruited — often through overseas sales agents/partners — and given trip logistics support (hotel, sometimes transport) to attend.
- A digital layer sits on top: an online exhibitor/exhibition directory, a buyer-supplier matchmaking or RFQ ("request for quotation") tool, and content channels (digital magazine, video) that keep the audience engaged between physical events and support SEO/organic reach.
- A partner or agent program extends reach into international markets, with agents earning commission for exhibitors or buyers they bring in.

**Why this is a real opportunity right now:**
- Buyers and exhibitors increasingly expect the registration, search, and communication experience of consumer apps — not multi-page forms and static PDF exhibitor lists.
- AI-based matching (buyer intent + exhibitor catalog + past RFQs) can meaningfully cut the time it takes a buyer to find the right few exhibitors instead of scrolling a directory of hundreds.
- Hybrid/virtual participation extends the addressable buyer base to companies who can't justify international travel for every show.
- A well-run partner program is a proven acquisition channel in cross-border B2B trade, particularly where local trust and relationships matter more than paid ads.

**Reference landscape (context, not a direct comparison):** this category sits alongside large horizontal B2B sourcing marketplaces (e.g., Alibaba.com, Global Sources, Made-in-China.com) and various regional trade-exhibition organizers that combine physical shows with online buyer-matchmaking, hotel booking, and content media. ExpoBridge's difference is being one integrated, mobile-first product rather than a set of loosely connected pages and sub-domains.

## 3. Goals & Success Criteria

**Business goals**
- Launch a working platform ahead of your first hosted exhibition(s), able to onboard exhibitors and international buyers digitally before the event and support them on-site.
- Build a platform architecture reusable across multiple exhibitions, cities, and industry verticals (multi-tenant from day one, even if you start with a single vertical).
- Establish a partner/agent acquisition channel with transparent, automated commission tracking from launch.

**Product goals**
- Cut registration time to under 60 seconds for a buyer or exhibitor with a phone number or existing social account.
- Replace static exhibitor directories with a searchable, filterable, AI-assisted matching experience.
- Give exhibitors self-service tools (booth selection, profile, lead capture) so operations staff aren't manually processing every request.
- Support both in-person and remote/virtual participation for every exhibition.

*Numeric targets (registrations per event, conversion rate, revenue per exhibition) should be filled in once your first event's scale and vertical are confirmed — see Section 17.*

## 4. Differentiation Strategy

Rather than compete on being a bigger directory, ExpoBridge competes on speed, intelligence, and a unified experience.

| Capability | Typical incumbent in this category | ExpoBridge approach |
|---|---|---|
| Registration | Multi-field form, manual review, separate logins per sub-site | One-tap phone/social login, single sign-on across all modules, progressive profiling |
| Finding the right match | Manual browsing of a static exhibitor list | AI-assisted matchmaking + smart filters based on buyer intent and RFQ history |
| Event participation | Physical attendance only | Hybrid: physical booth + virtual booth + on-demand replay |
| Check-in | Paper badge, manual desk queue | QR digital badge, self-service kiosk, lead-retrieval scanning app |
| Meetings | Manual email/chat coordination | In-app meeting scheduler with calendar sync and reminders |
| Payments | Bank transfer / manual invoicing | Card, PayPal, Alipay, WeChat Pay, bank transfer, escrow for cross-border deals |
| Partner tracking | Spreadsheets, manual commission calculation | Automated partner portal with real-time referral and commission dashboards |
| Content | Static news pages | Interactive digital magazine + live and on-demand video, gated by membership tier |
| Design | Dense, form-heavy, legacy corporate layout | Modern, mobile-first design system with clear visual hierarchy |

## 5. Target Users & Personas

| Persona | Who they are | Primary goals | Key pain points today |
|---|---|---|---|
| **Exhibitor** (SME manufacturer/brand) | Sales/marketing manager exhibiting to find buyers | Book a booth, generate qualified leads, track ROI | Slow booth booking, no visibility into attendees, manual lead sheets |
| **International Buyer / Sourcing Agent** | Procurement manager or agent sourcing for their company or clients | Find verified suppliers quickly, request quotes, schedule meetings | Slow directory browsing, hard to verify legitimacy, travel logistics handled separately |
| **Trade Visitor / Industry Professional** | Attends for networking, research, or media coverage | Discover relevant exhibitors/sessions, network efficiently | No personalization, hard to plan a multi-day visit |
| **Sales Partner / Agent** | Independent or agency partner recruiting exhibitors/buyers regionally for commission | Track referrals and commissions, get marketing materials | Manual tracking, delayed/opaque payouts |
| **Platform Admin / Organizer Staff** | Internal team running exhibitions and moderating the platform | Manage listings, floor plans, content, disputes | Disconnected back-end tools, manual reporting |

## 6. Scope: MVP vs. Future Phases

**In scope for MVP (Phase 1):** public site and exhibition directory, fast registration/login, exhibitor and buyer portals, booth booking with payment, RFQ/procurement board, hotel booking, basic admin CMS, partner referral tracking, bilingual support (English + one additional language of your choice).

**Deferred to later phases:** AI matchmaking engine, in-app meeting scheduler, live chat, virtual/hybrid booths and livestreaming, native mobile apps, gamification, advanced BI dashboards, additional languages/currencies, public API. (Full phasing in Section 15.)

**Explicitly out of scope for now:** in-house payment processing (use licensed third-party PSPs instead), VR/AR booths, blockchain-based ticketing — these add cost and complexity without being necessary to prove the model.

## 7. Information Architecture / Sitemap

```
Home
├── Exhibitions
│   ├── Browse / Search Exhibitions
│   ├── Exhibition Detail (schedule, floor plan, exhibitor list, book booth)
│   └── Past Exhibitions / Case Studies
├── Marketplace (Procurement / RFQ)
│   ├── Browse Buy Requests
│   ├── Post a Buy Request
│   └── My Quotes
├── Exhibitor Directory
│   └── Exhibitor Profile / Microsite
├── Travel
│   ├── Hotel Booking
│   └── Visa Invitation Letter / Transport
├── Content Hub
│   ├── Magazine
│   └── Video / Live
├── Partner Program
│   ├── Become a Partner
│   └── Partner Dashboard (after login)
├── Pricing
├── About
│   ├── Company
│   ├── News
│   ├── Case Studies
│   └── Contact
└── Account
    ├── Login / Register
    ├── Dashboard (role-based: Buyer / Exhibitor / Partner / Admin)
    ├── Messages & Meetings
    ├── Saved / Favorites
    └── Settings
```

## 8. Feature Requirements (Core Modules)

### 8.1 Fast Onboarding & Account System — *flagship requirement*

| Feature | Details |
|---|---|
| One-tap sign-up | Google, Apple, LinkedIn, and phone-number (OTP) sign-up, plus email magic-link (no password to remember) |
| Minimal required fields | Only name, contact method, role (buyer/exhibitor/visitor/partner), and country required at sign-up; company details, industry, and product interest are collected via progressive profiling after first login |
| Guest browsing | Exhibitions, exhibitor directory, and magazine content are browsable without an account; registration is only required to message, book, or request a quote |
| Single sign-on (SSO) | One login works across the main site, marketplace, content hub, and partner portal |
| Business card / OCR import | Buyers and exhibitors can scan a business card at check-in to pre-fill a profile instead of typing |
| Role switching | A single account can hold multiple roles (e.g., an exhibitor who is also a buyer at another show) without duplicate accounts |

*User stories:*
- *As a buyer, I want to register with just my phone number so I can browse exhibitors within seconds of landing on the site.*
- *As an exhibitor, I want to complete my company profile gradually after my first booth booking instead of filling a long form up front.*

### 8.2 Exhibition Discovery & Event Hub

| Feature | Details |
|---|---|
| Exhibition calendar | Filterable by industry, city, date, and format (physical/hybrid/virtual) |
| Exhibition detail page | Dates, venue, floor plan preview, exhibitor list, visitor registration, "who's attending" teaser |
| Personalized recommendations | Suggested exhibitions based on a buyer's stated industry/interest |
| Countdown & reminders | Automated email/SMS/WhatsApp reminders as an exhibition date approaches |

### 8.3 Exhibitor Portal

| Feature | Details |
|---|---|
| Interactive floor plan & booth booking | Real-time booth availability map; exhibitors select and pay for a location online instead of by phone/email |
| Exhibitor microsite | Auto-generated public profile: company info, product catalog, certifications, video, meeting-request button |
| Lead capture & CRM | Exhibitors scan visitor badges (QR) on-site, or capture leads from profile views/RFQ interest; leads flow into a built-in CRM with notes and status tags |
| Team accounts | Multiple staff logins per exhibitor with role permissions |
| ROI dashboard | Booth traffic, leads captured, meetings booked, RFQs received per exhibition |

### 8.4 Buyer / Visitor Portal

| Feature | Details |
|---|---|
| Smart exhibitor search | Filter by industry, product category, country, certification, "verified supplier" status |
| Saved suppliers & shortlists | Bookmark exhibitors and organize into project-based lists |
| Personalized feed | Recommended exhibitors and buy-request matches based on browsing and RFQ history |
| Visit planner | Build a personal show-day itinerary from saved exhibitors and booked meetings |

### 8.5 AI Matchmaking & Smart Search

| Feature | Details |
|---|---|
| Buyer–exhibitor matching engine | Recommends relevant exhibitors to a buyer (and relevant buyers to an exhibitor) based on stated industry, product interest, RFQ content, and past interactions |
| Natural-language / semantic search | Buyers can search in plain language ("stainless steel kitchenware manufacturers") instead of relying on rigid category trees |
| Auto-suggested meetings | System proactively suggests meeting slots between a buyer and a highly-matched exhibitor during the event |
| Match explainability | Each recommendation shows *why* it was suggested (shared category, matching certification, similar past RFQ) to build trust |

### 8.6 Procurement / RFQ Marketplace

| Feature | Details |
|---|---|
| Post a buy request | Buyers publish an RFQ with product spec, quantity, target price range, and deadline |
| Browse buy requests | Verified exhibitors/suppliers browse open RFQs relevant to their category |
| Quote submission & comparison | Suppliers submit quotes in-platform; buyers compare side-by-side instead of juggling emails |
| RFQ status tracking | Draft → Open → Quotes received → Awarded → Closed, visible to both sides |

### 8.7 Meetings, Messaging & Virtual/Hybrid Booths

| Feature | Details |
|---|---|
| In-app meeting scheduler | Buyers/exhibitors propose and confirm meeting slots; syncs to Google/Outlook calendar |
| Real-time messaging | Direct chat between buyers and exhibitors, with file/catalog sharing |
| Virtual booth | Every exhibitor gets a lightweight virtual booth (catalog, video, live chat) so remote buyers can engage without traveling |
| Livestream booth tours & keynotes | Selected sessions and booth walkthroughs streamed live with on-demand replay |

### 8.8 Hotel, Travel & Logistics Hub

| Feature | Details |
|---|---|
| Hotel booking | Curated, negotiated-rate hotels near the venue, bookable in-platform |
| Visa invitation letters | Auto-generated invitation letter for international buyers who need one |
| Airport transfer / shuttle | Optional shuttle booking between airport, hotel, and venue |
| Trip itinerary | Combined view of hotel and show schedule in one place |

### 8.9 Content Hub: Magazine & Video

| Feature | Details |
|---|---|
| Digital magazine | Interactive flipbook + web-article format; industry news, exhibitor spotlights, buyer guides |
| Subscription tiers | Some content free, deeper reports/data gated behind a paid or verified-member tier |
| Video hub | On-demand product demos, exhibitor interviews, event recap videos |
| Livestreaming | Live keynote sessions and booth tours during exhibition dates |

### 8.10 Partner / Agent Program Portal

| Feature | Details |
|---|---|
| Referral link & tracking | Each partner gets a unique link/code; signups and bookings are attributed automatically |
| Commission dashboard | Real-time view of referred users, conversion status, and commission earned/paid |
| Marketing kit | Downloadable banners, brochures, and pitch decks partners can use in their region |
| Tiered structure | Multiple partner tiers (e.g., standard agent vs. master agent with sub-agents) with different commission rates |

### 8.11 Payments & Subscriptions

| Feature | Details |
|---|---|
| Payment methods | Card, PayPal, Alipay, WeChat Pay, bank transfer; escrow option for large cross-border deals |
| What's paid for | Booth bookings, sponsorship packages, membership tiers, hotel bookings, magazine subscriptions |
| Invoicing | Auto-generated invoices/receipts for accounting and expense claims |
| Multi-currency | Prices displayed and charged in the buyer's local currency where supported |

### 8.12 Admin / Organizer Back Office

| Feature | Details |
|---|---|
| Exhibition & floor-plan management | Create/edit exhibitions, define booth inventory and pricing, manage floor plans |
| Content moderation | Approve exhibitor listings, RFQs, and magazine submissions before they go live |
| User & role management | Manage accounts, roles, verification status, and disputes |
| Reporting | Registration, revenue, and engagement reports exportable for the operations team |

### 8.13 Notifications
Email, SMS, WhatsApp Business, and in-app/push notifications for: registration confirmation, booth booking confirmation, new RFQ match, meeting request/confirmation, exhibition reminders, and partner commission payouts.

### 8.14 Trust, Verification & Reviews

| Feature | Details |
|---|---|
| Business verification | Business license/registration check for a "Verified Supplier" or "Verified Buyer" badge |
| Ratings & reviews | Post-meeting or post-transaction rating between buyers and exhibitors |
| Report/flag | Users can report suspicious listings or messages for admin review |

### 8.15 Analytics & Reporting
Role-specific dashboards: organizers see platform-wide registration/revenue trends; exhibitors see booth traffic and lead ROI; buyers see their RFQ and meeting history; partners see referral performance.

### 8.16 Platform-Wide Capabilities
Multi-language (start with English + one more; architecture should support adding languages, including right-to-left scripts, without rework), multi-currency, a fully responsive web app at launch with native iOS/Android apps in a later phase, and a partner-facing API for later integration with external CRMs (Salesforce, HubSpot) and marketing tools (Mailchimp).

## 9. Key User Flows

**A. Fast Registration (target: under 60 seconds)**
1. Visitor taps "Register" → selects role (Buyer / Exhibitor / Visitor / Partner)
2. Chooses phone OTP or one-tap social login
3. Enters name + confirms role + country (3 fields)
4. Lands directly in their role-based dashboard — no waiting for manual approval to *browse*
5. Deeper profile fields (company, industry, product interest) are requested contextually the first time they take an action that needs them (e.g., posting an RFQ)

**B. Exhibitor Booth Booking**
1. Exhibitor logs in → selects an exhibition → opens interactive floor plan
2. Selects an available booth (real-time availability) → chooses package tier (Standard/Gold/Platinum)
3. Pays online → receives instant confirmation and invoice
4. Prompted to complete exhibitor microsite profile (logo, catalog, video)

**C. Buyer Sourcing (RFQ) Flow**
1. Buyer searches or is matched to relevant exhibitors
2. Posts an RFQ with product spec and target quantity/price
3. Receives quotes from interested/matched suppliers in-platform
4. Compares quotes → messages top choices → books a meeting at the show (physical or virtual)

**D. On-Site Check-In & Lead Capture**
1. Attendee arrives → scans their digital QR badge at entry (no paper form)
2. Exhibitors scan the same badge with the lead-retrieval app to instantly capture contact details and notes
3. Captured leads sync automatically to the exhibitor's CRM dashboard

**E. Partner Referral**
1. Partner shares their unique referral link/QR with prospective exhibitors or buyers
2. Referred user registers through the link → tagged to that partner automatically
3. Partner dashboard updates in real time as the referred user books/pays
4. Commission calculated automatically and scheduled for payout

## 10. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Core pages load in under 2 seconds on a typical mobile connection; registration completes in under 60 seconds end-to-end |
| Scalability | Architecture must handle traffic spikes during registration windows and peak show days without degradation |
| Availability | 99.9% uptime target for core booking/registration services |
| Security | Encryption in transit and at rest; PCI-DSS-compliant payment handling via licensed PSPs (never store raw card data); 2FA for admin accounts; regular penetration testing |
| Data privacy & compliance | Design for GDPR (EU buyers) and relevant data-protection/cross-border rules in whichever countries you operate and host data in — confirm specific obligations with local counsel given the cross-border nature of this business |
| Accessibility | WCAG 2.1 AA target for the public-facing site |
| Localization | UI framework must support additional languages, including right-to-left scripts, without structural rework |
| Device support | Fully responsive from launch (mobile, tablet, desktop); native apps in a later phase |
| Backup & recovery | Automated daily backups, documented disaster-recovery/restore process |

## 11. Technical Architecture & Recommended Stack

*Directional recommendation — confirm with your engineering lead based on team skills and budget.*

- **Frontend:** React/Next.js web app with a shared component/design-token library (see Section 12); React Native or Flutter for the later native mobile app so business logic can be reused.
- **Backend:** Service-oriented backend (e.g., Node.js/NestJS or Python/FastAPI) split roughly into: identity/auth, exhibitions & booking, marketplace/RFQ, messaging, content (magazine/video), payments, partner/commissions.
- **Database:** PostgreSQL as the primary store; Redis for caching and session/OTP handling; Elasticsearch (or OpenSearch) for exhibitor/RFQ search and the matchmaking layer.
- **Auth:** OAuth2/OIDC-based auth supporting social login providers, phone OTP, and magic links; a single sign-on token shared across sub-domains/modules.
- **Real-time:** WebSocket-based service (e.g., Socket.io) for chat and live meeting-slot updates.
- **Video/livestream:** A managed streaming SDK (e.g., Agora, Zoom SDK, or a cloud provider's live-streaming service) rather than building video infrastructure in-house.
- **Payments:** Stripe and/or a regional PSP for cards, plus direct integrations for Alipay and WeChat Pay to match your buyer base's preferred methods.
- **Notifications:** Transactional email (e.g., SendGrid/SES), SMS/WhatsApp Business API provider, and push notifications (Firebase Cloud Messaging).
- **CMS:** A headless CMS (e.g., Strapi or Contentful) for the magazine/content hub so non-engineers can publish.
- **Infrastructure:** Containerized services (Docker/Kubernetes) on a cloud provider with strong presence both where your users are and where you need China connectivity if applicable (evaluate a dual-cloud or CDN strategy — e.g., an international cloud plus a mainland-China-compliant CDN/ICP-licensed hosting if you'll have significant mainland China traffic).
- **Analytics:** Product analytics (e.g., Amplitude/Mixpanel) plus standard web analytics for marketing.

## 12. Design Direction

The ask is explicitly a *different* look and feel from any existing player, so this section is directional rather than prescriptive:

- **Tone:** modern, clean, and trustworthy — avoid the dense, text-heavy, banner-cluttered look common in legacy B2B exhibition sites. Favor generous white space, clear visual hierarchy, and large, legible typography.
- **Mobile-first:** design every core flow (registration, search, booth booking, RFQ) for a phone screen first, then scale up — a large share of your buyer base will register and browse from mobile.
- **Design system:** build a componentized design system (color tokens, type scale, spacing scale, reusable components) from day one so the product stays consistent as new modules are added.
- **Imagery:** prioritize real photography/video of exhibitions and products over generic stock graphics — trust and credibility matter heavily in cross-border B2B trade.
- **Multi-script typography:** choose a type system that renders cleanly in Latin, Chinese, and (if you expand there) Arabic or Cyrillic scripts, given the international buyer base this business model targets.

*If your team wants a working component library and styling approach, that's a natural follow-up build task once the brand direction — logo, color palette, name — is finalized.*

## 13. Monetization Model & Pricing

**Revenue streams**
- Exhibitor booth bookings and sponsorship packages
- Buyer/exhibitor membership subscriptions (unlock advanced search, unlimited RFQs, verified badge)
- Lead-generation / pay-per-qualified-meeting fees
- Magazine and video advertising / sponsored content
- Value-added services: visa invitation letters, translation, virtual booth design, premium analytics reports
- Government/city contracts for place-branding and MICE-tourism promotion campaigns run through the platform
- *(Partner commission is a cost, not revenue — but drives volume for the streams above.)*

**Illustrative pricing tiers** *(placeholders — validate against your market and costs)*

| Buyer tier | Price | Includes |
|---|---|---|
| Free | $0 | Browse exhibitors, post limited RFQs, standard search |
| Verified | Paid, annual | Verified badge, unlimited RFQs, priority in matchmaking results |
| Enterprise | Custom | Team seats, API access, dedicated account manager |

| Exhibitor booth package | Includes |
|---|---|
| Standard | Booth space, basic microsite, standard directory placement |
| Gold | + featured directory placement, lead-capture app, 1 RFQ alert category |
| Platinum | + homepage/exhibition-page featured spot, virtual booth, unlimited RFQ alerts, dedicated account manager |

## 14. Success Metrics (KPIs)

| Metric | Why it matters |
|---|---|
| Registration completion rate & time-to-register | Validates the "fast registration" goal directly |
| Exhibitors & buyers onboarded per exhibition | Core marketplace liquidity |
| Buyer–exhibitor meetings booked per exhibition | Signals real matchmaking value, not just browsing |
| RFQ-to-quote and RFQ-to-deal conversion | Marketplace effectiveness |
| Revenue per exhibition (booth + subscriptions + services) | Business viability |
| % of signups from partner referrals | Health of the agent/partner channel |
| Portal DAU/MAU (buyer & exhibitor dashboards) | Ongoing engagement between shows |
| NPS / CSAT (buyers and exhibitors, separately) | Experience quality |
| Booth renewal rate at the next exhibition | Exhibitor satisfaction/retention |

## 15. Roadmap & Phasing

| Phase | Approx. timeline | Key deliverables |
|---|---|---|
| **Phase 1 — MVP** | Months 1–3 | Public site + exhibition listings, fast registration/SSO, exhibitor & buyer portals, booth booking with payment, basic RFQ board, hotel booking, admin CMS, bilingual support |
| **Phase 2 — Intelligence & Engagement** | Months 3–6 | AI matchmaking engine, in-app meeting scheduler, real-time messaging, QR digital badge + lead-retrieval app, partner portal with commission automation, digital magazine |
| **Phase 3 — Scale** | Months 6–12 | Virtual/hybrid booths + livestreaming, native mobile apps, advanced analytics/BI dashboards, gamification for attendee engagement, additional languages/currencies, public partner API, escrow payments |

## 16. Risks, Assumptions & Dependencies

**Key assumptions to validate (see Section 17):** target industry vertical, target buyer geography, initial exhibition city/venue, budget and timeline, in-house vs. outsourced development.

**Risks**
- **Two-sided marketplace / cold start:** the platform needs both exhibitors and buyers present at launch to be useful to either side — plan an initial high-touch outreach effort (e.g., through your own or partners' existing networks) rather than relying on the platform alone to bootstrap.
- **Cross-border payments & compliance:** multi-currency and multi-PSP payments add regulatory complexity; budget time for compliance review per market you operate in.
- **Data residency:** if you operate in and target mainland China alongside international markets, hosting/licensing requirements (e.g., ICP filing) may require a dual-region architecture — flag this early with engineering.
- **Competitive response:** established players in this category have existing exhibitor/buyer relationships; differentiation on speed and UX needs to be paired with real sales/partnership effort, not just product.

**Dependencies:** venue and hotel partner agreements/APIs, payment gateway approvals per market, an initial seed list of exhibitors/buyers (often via founder network or early partners), translation resources for non-English content.

## 17. Open Questions for Stakeholder Input

This PRD uses reasonable defaults so it's usable as a first draft; confirm the following and feed it back into a v1.1 revision:

- What industry vertical(s) will the first exhibitions cover?
- What's the primary buyer geography — mainland China outbound, Southeast Asia, Middle East, global, or a specific region?
- What city/venue and date is targeted for the first physical exhibition?
- What's the budget and timeline for the MVP build?
- In-house development team, agency, or a mix?
- Is a native mobile app needed at launch, or is mobile-web sufficient for Phase 1?
- What existing exhibitor/buyer relationships or partner network exists to seed the marketplace at launch?

## 18. Glossary

- **RFQ** — Request for Quotation; a buyer's posted sourcing requirement that suppliers respond to with a price/offer.
- **MICE** — Meetings, Incentives, Conferences, and Exhibitions; the broader industry category this business sits in.
- **KYC** — Know Your Customer; identity/business verification process.
- **PSP** — Payment Service Provider (e.g., Stripe, a licensed payment processor).
- **SSO** — Single Sign-On; one login session valid across multiple modules/sub-domains.
- **Lead retrieval** — the process of an exhibitor scanning an attendee's badge to instantly capture their contact details as a sales lead.

---

*End of document. This PRD is a first draft meant to be refined with your team's answers to Section 17 and validated with real exhibitors/buyers before development begins.*
