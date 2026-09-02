import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateQuoteStatus, deleteQuote } from "@/lib/server/rfqs-repo";

const VALID_STATUSES = ["submitted", "accepted", "rejected"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateQuoteStatus(Number(id), status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteQuote(Number(id));
  return NextResponse.json({ ok: true });
}
