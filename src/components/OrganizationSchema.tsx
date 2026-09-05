import { companyProfileSocialLinks, type CompanyProfile } from "@/lib/company-profile";

const SITE_URL = "https://www.theuniqueexpo.com";

// Renders sitewide Organization JSON-LD from the admin-editable company
// profile (src/app/admin/company-profile) so AI/search entity recognition
// reflects real business data instead of nothing at all -- fields the
// admin hasn't filled in yet are simply omitted rather than faked.
export default function OrganizationSchema({ profile }: { profile: CompanyProfile }) {
  const sameAs = companyProfileSocialLinks(profile).map((s) => s.url);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: profile.legalName,
    url: SITE_URL,
  };
  if (profile.logoUrl) schema.logo = profile.logoUrl;
  if (profile.contactEmail) schema.email = profile.contactEmail;
  if (profile.phone) schema.telephone = profile.phone;
  if (sameAs.length > 0) schema.sameAs = sameAs;
  if (profile.addressLine || profile.addressCity || profile.addressCountry) {
    schema.address = {
      "@type": "PostalAddress",
      ...(profile.addressLine && { streetAddress: profile.addressLine }),
      ...(profile.addressCity && { addressLocality: profile.addressCity }),
      ...(profile.addressCountry && { addressCountry: profile.addressCountry }),
    };
  }

  // Escape "<" so a field value can never close out the script tag early.
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
