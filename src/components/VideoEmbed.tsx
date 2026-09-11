export default function VideoEmbed({ title, embedUrl }: { title: string; embedUrl: string }) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
