import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getUserById, updateUser, deleteUser, countAdmins } from "@/lib/server/users-repo";

const VALID_ROLES = ["buyer", "exhibitor", "partner", "admin"];
const VALID_STATUSES = ["active", "suspended"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const role = body.role !== undefined ? String(body.role) : undefined;
  const status = body.status !== undefined ? String(body.status) : undefined;

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // An admin can't demote or suspend their own account -- both would risk
  // locking every admin out with no way back in without direct DB access.
  if (targetId === admin.id && ((role !== undefined && role !== "admin") || status === "suspended")) {
    return NextResponse.json({ error: "You cannot change your own role or suspend yourself" }, { status: 400 });
  }

  // Same guard, aimed at someone else: don't let the last remaining
  // active admin get demoted or suspended by another admin either.
  const losingAdminStatus = target.role === "admin" && ((role !== undefined && role !== "admin") || status === "suspended");
  if (losingAdminStatus) {
    const remaining = await countAdmins(targetId);
    if (remaining === 0) {
      return NextResponse.json({ error: "Cannot remove the last remaining admin" }, { status: 400 });
    }
  }

  await updateUser(targetId, { role, status: status as "active" | "suspended" | undefined });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const targetId = Number(id);
  if (targetId === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role === "admin") {
    const remaining = await countAdmins(targetId);
    if (remaining === 0) {
      return NextResponse.json({ error: "Cannot delete the last remaining admin" }, { status: 400 });
    }
  }

  try {
    await deleteUser(targetId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json(
      { error: "This user has related records (registrations, applications, etc.) and can't be deleted. Suspend the account instead." },
      { status: 409 }
    );
  }
}
