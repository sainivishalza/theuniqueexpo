import type { SitePageContent } from "@/lib/site-pages";

export default function SitePageView({ content }: { content: SitePageContent }) {
  const bodyParagraphs = content.body.split(/\n{2,}/).filter(Boolean);
  const hasContactBlock = !!(content.contactEmail || content.contactPhone);

  return (
    <div>
      <section className="gradient-hero py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">{content.heading}</h1>
          {content.tagline && (
            <p className="mt-4 text-lg text-emerald-100/90 max-w-2xl mx-auto">{content.tagline}</p>
          )}
        </div>
      </section>

      <section className="py-14 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 space-y-8">
          {(bodyParagraphs.length > 0 || hasContactBlock) && (
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              {bodyParagraphs.length > 0 && (
                <div className="space-y-4 text-gray-600 leading-relaxed">
                  {bodyParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
              {hasContactBlock && (
                <div className={`grid gap-4 sm:grid-cols-2 ${bodyParagraphs.length > 0 ? "mt-6 pt-6 border-t border-gray-100" : ""}`}>
                  {content.contactEmail && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-sm flex-shrink-0">✉</div>
                      <div>
                        <div className="text-xs text-gray-400">Email</div>
                        <a href={`mailto:${content.contactEmail}`} className="text-sm font-semibold text-gray-900 hover:text-emerald-600">{content.contactEmail}</a>
                      </div>
                    </div>
                  )}
                  {content.contactPhone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-sm flex-shrink-0">☎</div>
                      <div>
                        <div className="text-xs text-gray-400">Phone</div>
                        <span className="text-sm font-semibold text-gray-900">{content.contactPhone}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {content.items.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{content.itemsLabel}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {content.items.map((item, i) => (
                  <div key={i} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
