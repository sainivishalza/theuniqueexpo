import Link from "next/link";
import { businessTours, getTourBySlug } from "@/lib/tours";
import { formatNumber } from "@/lib/format";

export function generateStaticParams() {
  return businessTours.map((t) => ({ slug: t.slug }));
}

export default async function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = getTourBySlug(slug);
  if (!tour) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-500">Tour not found.</p></div>;

  return (
    <div>
      <section className="relative h-80 overflow-hidden bg-gray-900">
        <img src={tour.image} alt={tour.title} className="img-cover" />
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-7xl px-6 pb-8 w-full">
            <Link href="/services/business-tours" className="text-sm text-blue-300 hover:text-blue-200 mb-2 inline-block">← Back to Business Tours</Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">{tour.title}</h1>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-sm text-white">{tour.city}</span>
              <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-sm text-white">{tour.dates}</span>
              <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-sm text-white">{tour.duration}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Tour</h2>
              <p className="text-gray-600 leading-relaxed">{tour.description}</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl"><div className="text-2xl font-extrabold text-blue-600">${formatNumber(tour.price)}</div><div className="text-xs text-gray-400 mt-1">per person</div></div>
                <div className="text-center p-4 bg-gray-50 rounded-xl"><div className="text-2xl font-extrabold text-gray-900">{tour.groupSize}</div><div className="text-xs text-gray-400 mt-1">group size</div></div>
                <div className="text-center p-4 bg-gray-50 rounded-xl"><div className="text-2xl font-extrabold text-green-600">{tour.duration}</div><div className="text-xs text-gray-400 mt-1">duration</div></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Highlights</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {tour.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span className="text-sm text-gray-700">{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Day-by-Day Itinerary</h2>
              <div className="space-y-4">
                {tour.itinerary.map((day, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-20 flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{day.day}</div>
                    </div>
                    <div className="flex-1 pb-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">{day.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{day.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Book This Tour</h3>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">${formatNumber(tour.price)} <span className="text-base font-normal text-gray-400">USD/person</span></div>
              <p className="text-sm text-gray-400 mb-6">{tour.groupSize}</p>
              <Link href={"/services/business-tours/" + tour.slug + "/apply"} className="block w-full text-center rounded-xl gradient-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Apply Now</Link>
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Included:</h4>
                <ul className="space-y-2">
                  {tour.included.map((item) => (<li key={item} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500">✓</span>{item}</li>))}
                </ul>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Not Included:</h4>
                <ul className="space-y-2">
                  {tour.notIncluded.map((item) => (<li key={item} className="flex items-start gap-2 text-sm text-gray-500"><span className="text-red-400">✕</span>{item}</li>))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
