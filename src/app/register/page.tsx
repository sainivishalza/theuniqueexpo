"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type UserRole } from "@/lib/auth-context";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "buyer", label: "Buyer", description: "Source products & find suppliers" },
  { value: "exhibitor", label: "Exhibitor", description: "Showcase products & find buyers" },
  { value: "visitor", label: "Visitor", description: "Attend events & network" },
  { value: "partner", label: "Partner", description: "Refer buyers & exhibitors" },
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "China",
  "India",
  "Japan",
  "South Korea",
  "Brazil",
  "Australia",
  "Canada",
  "UAE",
  "Singapore",
  "Nigeria",
  "South Africa",
];

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");
  const [country, setCountry] = useState("");

  const canSubmit = name && email && country && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    register(name, email, role, country);
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-center text-2xl font-bold">Create your account</h1>

        {/* Social sign-up */}
        <div className="space-y-3">
          <button className="flex w-full items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>

          <button className="flex w-full items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            <svg className="h-5 w-5" fill="#0A66C2" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Sign up with LinkedIn
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or register with details</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selection */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700">I am a...</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded border px-3 py-2 text-left text-sm transition ${
                    role === r.value
                      ? "border-black bg-black text-white"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className={`text-xs ${role === r.value ? "text-gray-300" : "text-gray-500"}`}>
                    {r.description}
                  </div>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
