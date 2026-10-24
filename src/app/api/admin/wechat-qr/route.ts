import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { isValidUploadedImage } from "@/lib/server/validate-upload";
import { setWechatQr } from "@/lib/server/wechat-qr";

const MAX_QR_BYTES = 3 * 1024 * 1024;

// { image: "data:image/png;base64,..." } saves the WeChat QR code shown in the help box; DELETE removes it.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !isValidUploadedImage(body.image, MAX_QR_BYTES) || body.image.startsWith("data:image/gif")) {
    return NextResponse.json({ error: "Upload a picture (PNG, JPG or WebP) up to 3 MB" }, { status: 400 });
  }
  try {
    await setWechatQr(body.image);
  } catch (err) {
    console.error("Saving the WeChat QR code failed:", err);
    return NextResponse.json({ error: "Could not save the picture" }, { status: 500 });
  }
  logAdminAction(request, admin, "wechat_qr_saved", { targetType: "settings" });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  try {
    await setWechatQr(null);
  } catch (err) {
    console.error("Removing the WeChat QR code failed:", err);
    return NextResponse.json({ error: "Could not remove the picture" }, { status: 500 });
  }
  logAdminAction(request, admin, "wechat_qr_removed", { targetType: "settings" });
  return NextResponse.json({ ok: true });
}
