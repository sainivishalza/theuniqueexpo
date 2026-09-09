import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateTeamMember, deleteTeamMember } from "@/lib/server/team-members-repo";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.name || !body.role) {
    return NextResponse.json({ error: "name and role are required" }, { status: 400 });
  }

  try {
    await updateTeamMember(Number(id), {
      name: body.name,
      role: body.role,
      photo: body.photo || "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update team member error:", err);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteTeamMember(Number(id));
  return NextResponse.json({ ok: true });
}
