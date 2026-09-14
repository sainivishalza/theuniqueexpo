"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

// Editorial-style accordion: 1px bottom borders between questions instead
// of stacked cards, plus/minus icon flips to indicate open state. Only one
// question is open at a time so the list stays scannable.
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="border-t border-gray-200">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className="border-b border-gray-200">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-6 py-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 focus-visible:outline-offset-4"
            >
              <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-heading">
                {item.question}
              </span>
              <span className="shrink-0 relative w-5 h-5">
                <span className="absolute inset-y-1/2 left-0 w-5 h-px bg-emerald-950 -translate-y-1/2" />
                <span
                  className={`absolute inset-x-1/2 top-0 h-5 w-px bg-emerald-950 -translate-x-1/2 transition-opacity duration-200 ${
                    isOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-6 text-gray-600 text-sm leading-relaxed max-w-2xl">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
