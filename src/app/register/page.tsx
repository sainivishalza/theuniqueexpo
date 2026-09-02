"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/lib/auth-context";
import Logo from "@/components/Logo";

const roles: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: "buyer", label: "Buyer", icon: "🛒", desc: "Source products & find suppliers" },
  { value: "exhibitor", label: "Exhibitor", icon: "🏢", desc: "Showcase products at exhibitions" },
  { value: "visitor", label: "Visitor", icon: "👁️", desc: "Attend exhibitions & explore" },
  { value: "partner", label: "Partner", icon: "🤝", desc: "Refer clients & earn commissions" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" as UserRole, country: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role, form.country);
      router.push("/dashboard/" + form.role);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop&q=80"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Logo size="large" />
          <h1 className="text-4xl font-extrabold mt-8 mb-4 leading-tight">Join the<br/>Global Trade<br/>Community</h1>
          <p className="text-emerald-100 text-lg max-w-md">Create your free account and start connecting with exhibitors, buyers, and trade professionals worldwide.</p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            <div><div className="text-3xl font-extrabold">100K+</div><div className="text-sm text-emerald-200">Users</div></div>
            <div><div className="text-3xl font-extrabold">50+</div><div className="text-sm text-emerald-200">Countries</div></div>
            <div><div className="text-3xl font-extrabold">Free</div><div className="text-sm text-emerald-200">To join</div></div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Create your account</h2>
          <p className="text-gray-500 mb-8">It takes less than 60 seconds.</p>

          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <span className="text-xl">{r.icon}</span>
                    <div className="font-semibold text-sm mt-1">{r.label}</div>
                    <div className="text-xs text-gray-400">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" placeholder="e.g. UAE, India, China" />
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Already have an account?{" "}
              <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
