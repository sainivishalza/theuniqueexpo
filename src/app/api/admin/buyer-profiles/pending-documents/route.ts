import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listPendingDocuments } from "@/lib/server/buyer-pending-documents-repo";

// Lists buyer document photos expected from a bulk import (by filename)
// but not yet uploaded -- used to match a later-provided zip of the actual
// photos against the right buyer and document slot.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const documents = await listPendingDocuments();
  return NextResponse.json({ documents });
}
