import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { addNote, cleanTags, deleteNote, getMeta, MAX_NOTE, parseId, parseType, setAssignee, setTags, subjectExists } from "@/lib/server/record-meta";

// Internal notes, tags and "assigned to" on one buyer or registration (?type=buyer|registration&id=...).
async function target(request: Request, bodyType?: unknown, bodyId?: unknown) {
  const admin = await requireAdmin(request);
  if (!admin) return { error: NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 }) } as const;
  const params = new URL(request.url).searchParams;
  const type = parseType(bodyType ?? params.get("type"));
  const id = parseId(bodyId ?? params.get("id"));
  if (!type || !id) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) } as const;
  if (!(await subjectExists(type, id))) return { error: NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 }) } as const;
  return { admin, type, id } as const;
}

export async function GET(request: Request) {
  const t = await target(request);
  if ("error" in t) return t.error;
  return NextResponse.json(await getMeta(t.type, t.id), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const t = await target(request, body?.type, body?.id);
  if ("error" in t) return t.error;
  const { admin, type, id } = t;
  const label = { targetType: type === "buyer" ? "user" : "expo_registration", targetId: id } as const;

  if (body?.action === "note") {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (text.length < 1 || text.length > MAX_NOTE) return NextResponse.json({ error: `A note is 1 to ${MAX_NOTE} characters`, code: "bad_note" }, { status: 400 });
    await addNote(type, id, { id: admin.id, name: admin.name }, text);
    logAdminAction(request, admin, "internal_note_added", { ...label, details: text.slice(0, 80) });
  } else if (body?.action === "tags") {
    const tags = cleanTags(body.tags);
    if (!tags) return NextResponse.json({ error: "Up to 10 tags of up to 30 characters", code: "bad_tags" }, { status: 400 });
    await setTags(type, id, tags);
    logAdminAction(request, admin, "internal_tags_set", { ...label, details: tags.join(", ") || "(none)" });
  } else if (body?.action === "assign") {
    const raw = body.adminId;
    const adminId = raw === null || raw === "" ? null : parseId(raw);
    if (raw !== null && raw !== "" && adminId === null) return NextResponse.json({ error: "Choose an admin", code: "bad_admin" }, { status: 400 });
    if (!(await setAssignee(type, id, adminId))) return NextResponse.json({ error: "Choose an admin", code: "bad_admin" }, { status: 400 });
    logAdminAction(request, admin, "internal_assigned", { ...label, details: adminId === null ? "nobody" : `admin ${adminId}` });
  } else {
    return NextResponse.json({ error: "Unknown action", code: "bad_action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(await getMeta(type, id)) });
}

// Remove one of your own notes (?type=&id=&note=).
export async function DELETE(request: Request) {
  const t = await target(request);
  if ("error" in t) return t.error;
  const noteId = parseId(new URL(request.url).searchParams.get("note"));
  if (!noteId || !(await deleteNote(noteId, t.admin.id))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...(await getMeta(t.type, t.id)) });
}
