import { NextResponse } from "next/server";
import { cleanSupportBody, cleanSupportSubject, isSupportTopic } from "@/lib/support";
import { createThread, listMyThreads } from "@/lib/server/support";
import { limitOrNull, readJson, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The signed-in buyer's conversations with our team.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listMyThreads(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// A new question: { topic, subject, body }.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const subject = cleanSupportSubject(body.subject);
  const text = cleanSupportBody(body.body);
  if (!isSupportTopic(body.topic) || !subject || !text) return walletFail("invalid_input");
  const limited = await limitOrNull(auth.user.id, "support-new", 10, 24 * 60 * 60 * 1000);
  if (limited) return limited;
  try {
    return NextResponse.json({ id: await createThread(auth.user.id, { topic: body.topic, subject, body: text }) }, { status: 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
