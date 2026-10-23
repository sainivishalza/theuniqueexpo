import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { listExhibitions } from "@/lib/server/exhibitions-repo";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/Button";
import RegistrationWindowNote, { hasWindowNote } from "@/components/RegistrationWindowNote";
import { formatNumber } from "@/lib/format";
import { COMPARE_MAX, COMPARE_MIN, parseCompareSlugs } from "@/lib/compare";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("exhibitionsCompare");
  // The address depends on what was ticked, so there is nothing for a search engine to index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

// Two or three exhibitions side by side: /exhibitions/compare?slugs=a,b,c
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const [{ slugs }, locale, t, tw, tl] = await Promise.all([searchParams, getLocale(), getTranslations("exhibitionsCompare"), getTranslations("exhibitionsPage.window"), getTranslations("exhibitionsPage")]);
  const wanted = parseCompareSlugs(slugs);
  const all = await listExhibitions(locale);
  // In the order they were chosen; unknown names are left out.
  const items = wanted.map((s) => all.find((e) => e.slug === s)).filter((e): e is (typeof all)[number] => !!e);
  const dash = "—";
  const stateText = (state?: string) =>
    state === "open" ? t("stateOpen") : state === "opens_later" ? t("stateOpensLater") : state === "deadline_passed" ? t("stateClosed") : t("stateOff");

  if (items.length < COMPARE_MIN) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">{t("title")}</h1>
        <p className="mt-3 text-gray-700">{t("needTwo", { min: COMPARE_MIN, max: COMPARE_MAX })}</p>
        <div className="mt-6 flex justify-center"><Button href="/exhibitions" variant="gradientCta">{t("pickSome")}</Button></div>
      </div>
    );
  }

  const cols = items.length === 2 ? "grid-cols-2" : "grid-cols-3";
  const rows: { key: string; label: string; cell: (e: (typeof items)[number]) => React.ReactNode }[] = [
    { key: "dates", label: t("dates"), cell: (e) => e.dates || dash },
    { key: "city", label: t("city"), cell: (e) => [e.city, e.country].filter(Boolean).join(", ") || dash },
    { key: "venue", label: t("venue"), cell: (e) => e.venue || dash },
    { key: "industry", label: t("industry"), cell: (e) => e.industry || dash },
    { key: "organizer", label: t("organizer"), cell: (e) => e.organizer || dash },
    { key: "exhibitors", label: t("exhibitors"), cell: (e) => (e.exhibitors > 0 ? `${formatNumber(e.exhibitors)}+` : dash) },
    { key: "visitors", label: t("visitors"), cell: (e) => e.visitors || dash },
    {
      key: "registration",
      label: t("registration"),
      cell: (e) => (
        <>
          <span className="font-semibold">{stateText(e.registrationState)}</span>
          {hasWindowNote(e) && <RegistrationWindowNote info={e} t={tw} locale={locale} className="mt-1" />}
        </>
      ),
    },
    {
      key: "highlights",
      label: t("highlights"),
      cell: (e) =>
        e.highlights.length ? (
          <ul className="list-disc space-y-1 pl-4">
            {e.highlights.slice(0, 4).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          dash
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/exhibitions" className="text-sm font-semibold text-emerald-800 hover:underline">{t("back")}</Link>
      <h1 className="mt-3 text-3xl font-extrabold text-gray-900">{t("title")}</h1>
      <p className="mt-1 text-gray-700">{t("subtitle")}</p>

      <div className={`mt-6 grid ${cols} gap-3 sm:gap-6`}>
        {items.map((e) => (
          <div key={e.slug} className="min-w-0">
            <div className="relative h-24 overflow-hidden rounded-[var(--radius-card)] bg-gray-900 sm:h-40">
              <Image src={e.image} alt="" fill sizes="(max-width: 768px) 33vw, 300px" className="object-contain" />
            </div>
            <h2 className="mt-2 break-words text-sm font-bold leading-snug text-gray-900 sm:text-lg">
              <Link href={`/exhibitions/${e.slug}`} className="hover:underline">{e.title}</Link>
            </h2>
          </div>
        ))}
      </div>

      <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
        {rows.map((r) => (
          <section key={r.key} aria-labelledby={`cmp-${r.key}`} className="py-3">
            <h3 id={`cmp-${r.key}`} className="mb-1.5 text-xs font-bold text-gray-700 sm:text-sm">{r.label}</h3>
            <div className={`grid ${cols} gap-3 sm:gap-6`}>
              {items.map((e) => (
                <div key={e.slug} data-cmp={`${r.key}-${e.slug}`} className="min-w-0 break-words text-xs text-gray-900 sm:text-sm">{r.cell(e)}</div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className={`mt-6 grid ${cols} gap-3 sm:gap-6`}>
        {items.map((e) => (
          <div key={e.slug} className="min-w-0 space-y-2">
            <Button href={`/exhibitions/${e.slug}`} variant="secondaryOutline" size="block">{tl("viewDetails")}</Button>
            {e.registrationEnabled && <Button href={`/exhibitions/${e.slug}/register`} variant="gradientCta" size="block">{tl("register")}</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
