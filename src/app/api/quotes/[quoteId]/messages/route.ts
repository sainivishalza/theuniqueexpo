import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getOrCreateThreadForQuote, listMessages, sendMessage, getThreadForQuoteWithContext } from "@/lib/server/messages-repo";

async function assertParticipant(request: Request, quoteId: number) {
  const user = await getSessionUser(request);
  if (!user) return { error: NextResponse.json({ error: "Login required" }, { status: 401 }) };

  const thread = await getOrCreateThreadForQuote(quoteId);
  if (!thread) return { error: NextResponse.json({ error: "Quote not found" }, { status: 404 }) };

  if (user.id !== thread.buyer_id && user.id !== thread.exhibitor_id) {
    return { error: NextResponse.json({ error: "Not part of this conversation" }, { status: 403 }) };
  }
  return { user, thread };
}

export async function GET(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const result = await assertParticipant(request, Number(quoteId));
  if (result.error) return result.error;

  const [messages, context] = await Promise.all([
    listMessages(result.thread.id),
    getThreadForQuoteWithContext(Number(quoteId)),
  ]);
  return NextResponse.json({ thread: context, messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const result = await assertParticipant(request, Number(quoteId));
  if (result.error) return result.error;

  const body = await request.json();
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message text is required" }, { status: 400 });

  const message = await sendMessage(result.thread.id, result.user!.id, result.user!.name, text);
  return NextResponse.json({ message }, { status: 201 });
}
