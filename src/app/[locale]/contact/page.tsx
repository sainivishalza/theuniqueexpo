import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import IconBadge from "@/components/ui/IconBadge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ContactPage() {
  const t = await getTranslations("contactPage");

  const options = [
    { key: "visit", icon: "🎪", href: "/exhibitions" },
    { key: "trip", icon: "🧳", href: "/plan-business-trip" },
    { key: "partner", icon: "🤝", href: "/partner-with-us" },
  ] as const;

  return (
    <div>
      <section className="relative overflow-hidden bg-[var(--color-hero-bg)] py-20">
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-6 grid gap-6 md:grid-cols-3">
          {options.map((opt) => (
            <Card key={opt.key} shadow="sm" bordered={false} className="p-8 text-center flex flex-col items-center">
              <IconBadge icon={opt.icon} size="lg" tint="bg-emerald-50" />
              <h2 className="mt-5 text-xl font-bold text-heading">{t(`options.${opt.key}.title`)}</h2>
              <p className="mt-2 text-sm text-gray-500 flex-1">{t(`options.${opt.key}.description`)}</p>
              <Button href={opt.href} variant="gradientCta" size="wide" className="mt-6">
                {t(`options.${opt.key}.cta`)}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-12 bg-cream-50 border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-sm font-bold text-heading mb-2">{t("emailUs")}</h2>
          <a href={`mailto:${t("email")}`} className="text-emerald-700 hover:underline font-semibold">
            {t("email")}
          </a>
        </div>
      </section>
    </div>
  );
}
