import { getTranslations } from "next-intl/server";
import Button from "@/components/ui/Button";

export async function generateMetadata() {
  const t = await getTranslations("notFoundPage");
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function NotFound() {
  const t = await getTranslations("notFoundPage");
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gold-800">{t("code")}</p>
      <h1 className="mt-3 text-3xl font-extrabold text-heading md:text-4xl">{t("heading")}</h1>
      <p className="mt-4 text-gray-600">{t("body")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/" variant="primary">{t("home")}</Button>
        <Button href="/exhibitions" variant="secondaryOutline">{t("exhibitions")}</Button>
        <Button href="/contact" variant="secondaryOutline">{t("contact")}</Button>
      </div>
    </section>
  );
}
