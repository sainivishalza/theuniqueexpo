import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getAboutContent } from "@/lib/server/about-content-repo";

// Content only changes via the admin panel -- cache the rendered page and
// revalidate in the background instead of hitting the DB on every request.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getAboutContent();
  return { title: content.heading, description: content.tagline };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const content = await getAboutContent();
  const storyParagraphs = content.story.split(/\n{2,}/).filter(Boolean);

  return (
    <div>
      <section className="gradient-hero py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">{content.heading}</h1>
          <p className="mt-4 text-lg text-emerald-100/90 max-w-2xl mx-auto">{content.tagline}</p>
        </div>
      </section>

      {content.heroImage && (
        <section className="relative bg-gray-950 py-8 md:py-10 overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-6 flex justify-center">
            <Image
              src={content.heroImage}
              alt={content.heading}
              width={1200}
              height={800}
              sizes="(max-width: 768px) 100vw, 800px"
              className="max-w-full max-h-[60vh] w-auto h-auto rounded-xl shadow-2xl"
              priority
            />
          </div>
        </section>
      )}

      {content.stats.length > 0 && (
        <section className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-5xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {content.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-600">{s.value}</div>
                <div className="text-xs md:text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="py-14 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("ourStory")}</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              {storyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-lg mb-4">🎯</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("ourMission")}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{content.mission}</p>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-lg mb-4">🔭</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("ourVision")}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{content.vision}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
