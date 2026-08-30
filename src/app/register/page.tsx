"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type UserRole } from "@/lib/auth-context";

const ROLES: { value: UserRole; label: string; description: string; icon: string; color: string }[] = [
  { value: "buyer", label: "Buyer", description: "Source products & find suppliers", icon: "🛒", color: "from-blue-500 to-blue-600" },
  { value: "exhibitor", label: "Exhibitor", description: "Showcase products & find buyers", icon: "🏢", color: "from-purple-500 to-purple-600" },
  { value: "visitor", label: "Visitor", description: "Attend events & network", icon: "🎫", color: "from-emerald-500 to-green-600" },
  { value: "partner", label: "Partner", description: "Refer buyers & exhibitors", icon: "🤝", color: "from-orange-500 to-red-500" },
];

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "China",
  "India", "Japan", "South Korea", "Brazil", "Australia",
  "Canada", "UAE", "Singapore", "Nigeria", "South Africa",
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&h=1200&fit=crop&q=80"
            alt=""
            className="img-cover"
          />
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold">E</div>
            <span className="text-2xl font-extrabold">ExpoBridge</span>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Join the global trade community
          </h2>
          <p className="text-blue-200/80 text-lg leading-relaxed mb-8">
            Create your free account and start connecting with exhibitors and buyers at world-class trade fairs.
          </p>
          <div className="space-y-4">
            {ROLES.map((r) => (
              <div key={r.value} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <div className="font-semibold">{r.label}</div>
                  <div className="text-xs text-blue-200/60">{r.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold">E</div>
            <span className="text-xl font-extrabold text-gray-900">Expo<span className="text-blue-600">Bridge</span></span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-500">It&apos;s free. Start in under 60 seconds.</p>

          {/* Social */}
          <div className="mt-8 space-y-3">
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <svg className="h-5 w-5" fill="#0A66C2" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Sign up with LinkedIn
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-gray-50 px-3 text-gray-400">or register with details</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selection */}
            <fieldset>
              <legend className="block text-sm font-semibold text-gray-700 mb-3">I am a...</legend>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                      role === r.value
                        ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{r.icon}</span>
                    <div className="font-bold text-sm text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>
                    {role === r.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
