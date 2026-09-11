import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listVideos } from "@/lib/server/videos-repo";
import VideoEmbed from "@/components/VideoEmbed";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("videosPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function VideosPage() {
  const t = await getTranslations("videosPage");
  const videos = await listVideos();

  return (
    <div>
      <section className="bg-[var(--color-hero-bg)] py-16">
        <div className="mx-auto max-w-7xl px-6 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-xl">{t("subtitle")}</p>
        </div>
      </section>

      <section className="py-14 bg-cream-50">
        <div className="mx-auto max-w-6xl px-6">
          {videos.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{t("noVideosYet")}</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Card key={video.id} shadow="sm" bordered={false} className="overflow-hidden">
                  <VideoEmbed title={video.title} embedUrl={video.embedUrl} />
                  <div className="p-5">
                    {video.category && <Badge tone="emerald" size="tag" className="mb-2">{video.category}</Badge>}
                    <h2 className="font-bold text-heading">{video.title}</h2>
                    {video.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{video.description}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
