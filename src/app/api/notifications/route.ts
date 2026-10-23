import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { asLocale } from "@/lib/server/notifications";
import { listNotifications, markAllRead, markRead, unreadCount } from "@/lib/server/user-notifications";

const noStore = { "Cache-Control": "no-store" };

// The signed-in person's website notifications, newest first.
//   ?count=1       only the number of unread ones (the menu badge)
//   ?locale=ru     the language the texts an admin wrote are shown in
//   ?before=<id>   the next page
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if (params.get("count") === "1") return NextResponse.json({ unread: await unreadCount(user.id) }, { headers: noStore });
  const before = Number(params.get("before"));
  const result = await listNotifications(user.id, asLocale(params.get("locale")), 30, Number.isSafeInteger(before) && before > 0 ? before : undefined);
  return NextResponse.json(result, { headers: noStore });
}

// { action: "read", id } marks one as read, { action: "readAll" } all of them.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.action === "readAll") {
    await markAllRead(user.id);
    return NextResponse.json({ unread: 0 }, { headers: noStore });
  }
  if (body?.action === "read" && Number.isSafeInteger(body.id) && body.id > 0) {
    if (!(await markRead(user.id, body.id))) return NextResponse.json({ error: "not_found", code: "not_found" }, { status: 404 });
    return NextResponse.json({ unread: await unreadCount(user.id) }, { headers: noStore });
  }
  return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400 });
}
