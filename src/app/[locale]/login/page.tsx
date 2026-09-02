"use client";
import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop&q=80"
            alt=""
            fill
            sizes="50vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Logo size="large" />
          <h1 className="text-4xl font-extrabold mt-8 mb-4 leading-tight">Discover<br/>Something<br/>Unique Together</h1>
          <p className="text-emerald-100 text-lg max-w-md">Access 20+ global exhibitions, business tours, visa services, and B2B matchmaking — all in one platform.</p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            <div><div className="text-3xl font-extrabold">20+</div><div className="text-sm text-emerald-200">Exhibitions</div></div>
            <div><div className="text-3xl font-extrabold">5</div><div className="text-sm text-emerald-200">Tours</div></div>
            <div><div className="text-3xl font-extrabold">6</div><div className="text-sm text-emerald-200">Services</div></div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your account to continue.</p>

          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none bg-white" placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl gradient-brand py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">Create one free →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
