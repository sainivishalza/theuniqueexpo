"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import VideoEmbed from "@/components/VideoEmbed";

interface Video {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
}

// Self-contained: fetches its own data and renders nothing when there's
// nothing to show, so it can drop into an exhibition/tour detail page
// without that page needing to know about videos at all.
export default function RelatedVideos({ relatedType, relatedId }: { relatedType: "exhibition" | "tour"; relatedId: string }) {
  const t = useTranslations("relatedVideos");
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!relatedId) return;
    fetch(`/api/videos?relatedType=${relatedType}&relatedId=${encodeURIComponent(relatedId)}`)
      .then((res) => res.json())
      .then((data) => setVideos(data.videos || []))
      .catch(() => {});
  }, [relatedType, relatedId]);

  if (videos.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-heading mb-4">{t("title")}</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {videos.map((video) => (
          <div key={video.id}>
            <VideoEmbed title={video.title} embedUrl={video.embedUrl} />
            <p className="mt-2 text-sm font-semibold text-heading">{video.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
