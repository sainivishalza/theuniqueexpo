"use client";
import Image from "next/image";
import { subsidies, getOpenSubsidies } from "@/lib/subsidies";

export default function SubsidiesPage() {
  const openSubsidies = getOpenSubsidies();

  return (
    <div>
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 opacity-15">
          <Image src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1600&h=600&fit=crop&q=80" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-white">
          <p className="text-emerald-300 font-semibold mb-2">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-extrabold">Transport Subsidies</h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">Government and organizer-backed travel subsidies for exhibitors and buyers attending major trade fairs across China.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-500/20 backdrop-blur-sm px-4 py-2 text-sm text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {openSubsidies.length} subsidies currently open
          </div>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 space-y-8">
          {subsidies.map((sub) => (
            <div key={sub.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${sub.status === "closed" ? "opacity-60" : ""}`}>
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold ${sub.status === "open" ? "bg-green-100 text-green-700" : sub.status === "closing-soon" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {sub.status === "open" ? "Open" : sub.status === "closing-soon" ? "Closing Soon" : "Closed"}
                      </span>
                      <span className="text-sm text-gray-400">{sub.exhibitionTitle}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{sub.title}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-600">{sub.amount}</div>
                    <div className="text-sm text-gray-400">Deadline: {sub.deadline}</div>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">{sub.description}</p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Eligibility:</h3>
                    <ul className="space-y-2">
                      {sub.eligibility.map((e) => (<li key={e} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-emerald-500">•</span>{e}</li>))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Required Documents:</h3>
                    <ul className="space-y-2">
                      {sub.documents.map((d) => (<li key={d} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-amber-500">📄</span>{d}</li>))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">How to Apply:</h3>
                    <ol className="space-y-2">
                      {sub.howToApply.map((h, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-600"><span className="text-green-500 font-bold">{i + 1}.</span>{h}</li>))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
