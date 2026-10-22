import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { listTiers, saveTiers, type PointTier } from "@/lib/server/wallet-tiers";
import { positiveId, readJson, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The regions (and their points) of one exhibition: ?exhibitionId=
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId(new URL(request.url).searchParams.get("exhibitionId") ?? "");
  if (!id) return walletFail("invalid_input");
  try {
    return NextResponse.json({ tiers: await listTiers(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Replace the regions of an exhibition. An empty list goes back to one rate for everyone.
export async function PUT(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const id = body && typeof body.exhibitionId === "number" ? positiveId(String(body.exhibitionId)) : null;
  if (!body || !id || !Array.isArray(body.tiers)) return walletFail("invalid_input");
  const tiers: PointTier[] = [];
  for (const raw of body.tiers) {
    if (!raw || typeof raw !== "object") return walletFail("invalid_input");
    const t = raw as Record<string, unknown>;
    if (typeof t.name !== "string" || typeof t.keywords !== "string" || typeof t.points !== "number" || typeof t.isDefault !== "boolean") return walletFail("invalid_input");
    tiers.push({ name: t.name, keywords: t.keywords, points: t.points, isDefault: t.isDefault });
  }
  try {
    const error = await saveTiers(id, tiers);
    if (!error) logAdminAction(request, auth.admin, "point_regions_saved", { targetType: "exhibition", targetId: id, details: `${tiers.length} regions` });
    return error ? walletFail(error) : NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
