import { getCompanyProfile } from "@/lib/server/company-profile-repo";
import { listPublishedPosts } from "@/lib/server/blog-repo";

// llms.txt (llmstxt.org) -- a plain-text summary of the site aimed at LLMs
// that fetch raw pages rather than rendering them, so it repeats a few
// things already in the HTML (title, description, key sections) in a
// format that doesn't require parsing markup to extract. Built from the
// same admin-editable company profile as the Organization schema so the
// two never drift out of sync, plus the actual published blog posts so
// it stays current without another admin screen to maintain.
const SITE_URL = "https://theuniqueexpo.com";
const SITE_NAME = "The Unique Expo";
const SUMMARY =
  "TheUniqueExpo is a B2B exhibition, trade-fair, and sourcing platform connecting buyers with exhibitors across China's major trade fairs -- exhibition registration, booth booking, business and city tours, hotel arrangements, visa setup, and relocation support.";

export async function GET() {
  const [profile, posts] = await Promise.all([getCompanyProfile(), listPublishedPosts()]);

  const lines: string[] = [];
  lines.push(`# ${profile.legalName || SITE_NAME}`);
  lines.push("");
  lines.push(`> ${SUMMARY}`);
  lines.push("");

  lines.push("## Platform");
  lines.push(`- [Exhibitions](${SITE_URL}/en/exhibitions): Browse upcoming trade fairs and exhibitions across China.`);
  lines.push(`- [Exhibitor Directory](${SITE_URL}/en/directory): Search registered exhibitors by industry.`);
  lines.push(`- [RFQ Marketplace](${SITE_URL}/en/marketplace): Post and respond to buyer/exhibitor requests for quotes.`);
  lines.push(`- [Business Tours](${SITE_URL}/en/services/business-tours): Guided business and factory tours tied to exhibitions.`);
  lines.push(`- [China Tours](${SITE_URL}/en/services/china-tours): City and cultural tours for exhibition visitors.`);
  lines.push(`- [Events](${SITE_URL}/en/events): Local networking, hiking, picnic, and cultural meetups.`);
  lines.push(`- [Relocation Services](${SITE_URL}/en/relocation): Visa setup, moving assistance, and transport subsidies for exhibitors relocating to China.`);
  lines.push(`- [Consultation](${SITE_URL}/en/services/consultation): Book a paid or free consultation on sourcing, compliance, and market entry.`);
  lines.push(`- [Blog](${SITE_URL}/en/blog): Articles on relocating to and living in China for business.`);
  lines.push("");

  if (posts.length > 0) {
    lines.push("## Recent Articles");
    for (const post of posts.slice(0, 20)) {
      lines.push(`- [${post.title}](${SITE_URL}/en/blog/${post.slug}): ${post.excerpt}`);
    }
    lines.push("");
  }

  lines.push("## Contact");
  if (profile.contactEmail) lines.push(`- Email: ${profile.contactEmail}`);
  if (profile.phone) lines.push(`- Phone: ${profile.phone}`);
  if (profile.addressLine || profile.addressCity || profile.addressCountry) {
    lines.push(`- Address: ${[profile.addressLine, profile.addressCity, profile.addressCountry].filter(Boolean).join(", ")}`);
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
    },
  });
}
