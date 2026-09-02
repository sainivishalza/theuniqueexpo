"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

interface Thread {
  id: string;
  quoteId: string;
  rfqTitle: string;
  buyerId: string;
  buyerName: string;
  exhibitorId: string;
  exhibitorName: string;
  quotePrice: string;
  lastMessageBody: string;
  lastMessageAt: string;
}

export default function MessagesInboxPage() {
  const tr = useTranslations("messagesPage");
  const { user, loading: authLoading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/messages/threads")
      .then((res) => (res.ok ? res.json() : { threads: [] }))
      .then((data) => setThreads(data.threads || []))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-xl font-bold text-gray-900">{tr("loginPrompt")}</h1>
          <Link href="/login" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">{tr("logIn")}</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">{tr("title")}</h1>
      <p className="mt-1 text-sm text-gray-500">{tr("subtitle")}</p>

      {loading && <p className="mt-10 text-center text-gray-400">{tr("loading")}</p>}

      <div className="mt-6 space-y-3">
        {!loading && threads.length === 0 && (
          <p className="text-center text-gray-400 py-16">{tr("noConversations")}</p>
        )}
        {threads.map((t) => {
          const isBuyer = t.buyerId === String(user.id);
          const otherParty = isBuyer ? t.exhibitorName : t.buyerName;
          return (
            <Link
              key={t.id}
              href={`/messages/${t.quoteId}`}
              className="block rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.rfqTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tr(isBuyer ? "supplierLabel" : "buyerLabel")}: {otherParty} • {tr("quoteLabel")}: {t.quotePrice}
                  </p>
                  {t.lastMessageBody && (
                    <p className="text-sm text-gray-600 mt-1.5 truncate">{t.lastMessageBody}</p>
                  )}
                </div>
                {t.lastMessageAt && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(t.lastMessageAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
