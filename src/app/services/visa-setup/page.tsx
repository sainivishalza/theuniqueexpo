"use client";
import Image from "next/image";
import Link from "next/link";
import { visaServices } from "@/lib/visa-setup";

export default function VisaSetupPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1450101499163-c8848e968838?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">Company Setup & Visas</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">End-to-end assistance with setting up a business in China and obtaining the right visas.</p>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          {visaServices.map((svc) => (
            <div key={svc.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-auto">
                  <Image src={svc.image} alt={svc.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{svc.title}</h2>
                  <p className="text-gray-500 mb-6">{svc.description}</p>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">What&apos;s Included:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {svc.features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-green-500 mt-0.5">✓</span>{f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mb-6 text-sm">
                    <div><span className="text-gray-400">Pricing:</span> <span className="font-semibold text-gray-900">{svc.pricing}</span></div>
                    <div><span className="text-gray-400">Timeline:</span> <span className="font-semibold text-gray-900">{svc.estimatedTime}</span></div>
                  </div>
                  <Link href={"/services/visa-setup/apply?service=" + svc.id} className="inline-block rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">Get Started →</Link>
                </div>
              </div>
              <div className="border-t border-gray-100 px-8 py-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Process:</h3>
                <div className="flex flex-wrap gap-3">
                  {svc.process.map((step) => (
                    <div key={step.step} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">{step.step}</div>
                      <div className="text-sm"><span className="font-medium text-gray-900">{step.title}</span> <span className="text-gray-400">({step.duration})</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
