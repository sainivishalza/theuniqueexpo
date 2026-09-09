import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listTeamMembers, createTeamMember } from "@/lib/server/team-members-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const teamMembers = await listTeamMembers();
  return NextResponse.json({ teamMembers });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.name || !body.role) {
    return NextResponse.json({ error: "name and role are required" }, { status: 400 });
  }

  try {
    const id = await createTeamMember({
      name: body.name,
      role: body.role,
      photo: body.photo || "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Create team member error:", err);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}
