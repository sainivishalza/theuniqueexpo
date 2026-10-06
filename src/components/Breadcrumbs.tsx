import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const SITE_URL = "https://theuniqueexpo.com";

export interface Crumb {
  name: string;
  // Path without the locale prefix, e.g. "/exhibitions". Omit for the current page.
  href?: string;
}

// Visible trail plus BreadcrumbList structured data (Google only accepts the
// markup when it matches a breadcrumb trail the visitor can actually see).
export default function Breadcrumbs({ items, homeLabel, tone = "dark" }: { items: Crumb[]; homeLabel: string; tone?: "dark" | "light" }) {
  const locale = useLocale();
  const trail: Crumb[] = [{ name: homeLabel, href: "/" }, ...items];
  const abs = (href: string) => `${SITE_URL}/${locale}${href === "/" ? "" : href}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
  // Escape "<" so admin-entered titles can never close the script tag early.
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");

  const linkClass = tone === "dark" ? "text-emerald-200 hover:text-white hover:underline" : "text-emerald-700 hover:underline";
  const textClass = tone === "dark" ? "text-gray-300" : "text-gray-500";
  const sepClass = tone === "dark" ? "text-gray-500" : "text-gray-300";

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {trail.map((c, i) => (
          <li key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && <span aria-hidden="true" className={sepClass}>/</span>}
            {c.href ? (
              <Link href={c.href} className={linkClass}>{c.name}</Link>
            ) : (
              <span aria-current="page" className={`${textClass} truncate max-w-[60vw]`}>{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
