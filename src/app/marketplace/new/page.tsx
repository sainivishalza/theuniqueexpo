"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRFQ } from "@/lib/rfq";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES = [
  "Consumer Goods",
  "Electronics",
  "Industrial",
  "Automotive",
  "Food & Beverage",
  "Manufacturing",
  "Fashion",
  "Home & Garden",
  "Health & Beauty",
];

export default function NewRFQPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = title && product && category && description && quantity && !submitted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    createRFQ({
      title,
      product,
      category,
      description,
      quantity,
      targetPrice,
      deadline,
      buyerId: user.id,
      buyerName: user.name || user.email,
    });

    setSubmitted(true);
    setTimeout(() => router.push("/marketplace"), 1500);
  };

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Please log in to post a buy request.</p>
          <Link href="/login" className="mt-2 text-sm font-medium text-black hover:underline">
            Log in →
          </Link>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold">Buy Request Posted!</h1>
          <p className="text-gray-500">Redirecting to marketplace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/marketplace" className="text-sm text-gray-500 hover:underline">
        ← Back to marketplace
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Post a Buy Request</h1>
      <p className="mt-1 text-sm text-gray-500">
        Describe what you need and qualified suppliers will respond with quotes.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Title" placeholder="e.g. Stainless Steel Kitchenware Set">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
        </Field>

        <Field label="Product / Service" placeholder="e.g. Kitchenware, Electronics, Valves">
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="form-input"
          />
        </Field>

        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" placeholder="Detailed specs, requirements, quality standards...">
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity" placeholder="e.g. 5,000 units">
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-input"
            />
          </Field>

          <Field label="Target Price (optional)" placeholder="e.g. $25–35 per unit">
            <input
              type="text"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="form-input"
            />
          </Field>
        </div>

        <Field label="Deadline (optional)">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="form-input"
          />
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Post Buy Request
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  placeholder,
  children,
}: {
  label: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 [&_.form-input]:block [&_.form-input]:w-full [&_.form-input]:rounded [&_.form-input]:border [&_.form-input]:border-gray-300 [&_.form-input]:px-3 [&_.form-input]:py-2 [&_.form-input]:text-sm [&_.form-input]:focus:border-black [&_.form-input]:focus:outline-none [&_.form-input]:focus:ring-1 [&_.form-input]:focus:ring-black">
        {children}
      </div>
    </div>
  );
}
