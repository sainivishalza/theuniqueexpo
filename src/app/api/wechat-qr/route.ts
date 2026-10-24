import { getWechatQr } from "@/lib/server/wechat-qr";

// The WeChat QR code shown in the help box. Public, like the rest of the contact details.
export async function GET() {
  const qr = await getWechatQr();
  if (!qr) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(qr.bytes), {
    headers: {
      "Content-Type": qr.type,
      "Content-Disposition": 'inline; filename="wechat-qr"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
