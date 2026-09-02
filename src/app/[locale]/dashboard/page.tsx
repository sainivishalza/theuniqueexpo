"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(`/dashboard/${user.role}`);
  }, [user, router]);

  return (
    <main className="flex min-h-[calc(100vh-52px)] items-center justify-center">
      <p className="text-gray-500">Redirecting…</p>
    </main>
  );
}
