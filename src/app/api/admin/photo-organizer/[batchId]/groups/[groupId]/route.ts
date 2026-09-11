import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getGroup, updateGroupConfirmedName } from "@/lib/server/photo-organizer-repo";

export async function PATCH(request: Request, { params }: { params: Promise<{ batchId: string; groupId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId, groupId } = await params;
  const group = await getGroup(Number(groupId));
  if (!group || group.batchId !== Number(batchId)) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await request.json();
  const confirmedName = typeof body.confirmedName === "string" ? body.confirmedName.trim() : "";
  if (!confirmedName) {
    return NextResponse.json({ error: "confirmedName is required" }, { status: 400 });
  }

  await updateGroupConfirmedName(group.id, confirmedName);
  return NextResponse.json({ success: true });
}
