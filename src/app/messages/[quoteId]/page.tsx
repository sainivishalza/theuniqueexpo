"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface ThreadContext {
  id: string;
  quoteId: string;
  rfqId: string;
  rfqTitle: string;
  buyerId: string;
  buyerName: string;
  exhibitorId: string;
  exhibitorName: string;
  quotePrice: string;
}

export default function MessageThreadPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [thread, setThread] = useState<ThreadContext | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/quotes/${quoteId}/messages`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setThread(data.thread);
        setMessages(data.messages || []);
      })
      .catch(() => setThread(null));
  }, [quoteId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/quotes/${quoteId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setMessages((prev) => [...prev, data.message]);
      setText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Log in to view this conversation</h1>
          <Link href="/login" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">Log in →</Link>
        </div>
      </div>
    );
  }

  if (thread === undefined) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!thread) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Conversation not found</h1>
          <Link href="/messages" className="mt-3 inline-block text-emerald-600 hover:underline text-sm font-semibold">Back to messages →</Link>
        </div>
      </div>
    );
  }

  const isBuyer = thread.buyerId === String(user.id);
  const otherParty = isBuyer ? thread.exhibitorName : thread.buyerName;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/messages" className="text-sm text-gray-500 hover:underline">← Back to messages</Link>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 p-5">
          <h1 className="font-bold text-gray-900">{thread.rfqTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            With {otherParty} • Quote: {thread.quotePrice}
          </p>
          <Link href={`/marketplace/${thread.rfqId}`} className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
            View request →
          </Link>
        </div>

        <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello!</p>
          )}
          {messages.map((m) => {
            const mine = m.senderId === String(user.id);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                  {!mine && <p className="text-xs font-semibold mb-0.5 opacity-70">{m.senderName}</p>}
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-emerald-100" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-gray-100 p-4 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
        {error && <p className="px-4 pb-3 text-xs text-red-600">{error}</p>}
      </div>
    </main>
  );
}
