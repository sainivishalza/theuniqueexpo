import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { requireAdmin } from "@/lib/auth-server";
import { getGroup } from "@/lib/server/photo-organizer-repo";
import { extractedDir } from "@/lib/server/photo-organizer/paths";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

// Serves the group's detected passport photo for the review screen.
// Deliberately not resized server-side (sharp's native binary has known
// GLIBC issues on this host, per next.config.js's SWC comment) -- the
// browser scales it down with plain CSS instead.
export async function GET(request: Request, { params }: { params: Promise<{ batchId: string; groupId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId, groupId } = await params;
  const group = await getGroup(Number(groupId));
  if (!group || group.batchId !== Number(batchId) || !group.passportFilename) {
    return NextResponse.json({ error: "No passport photo for this group" }, { status: 404 });
  }

  const filePath = path.join(extractedDir(Number(batchId)), group.passportFilename);
  const bytes = await fs.promises.readFile(filePath).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: "Photo file missing" }, { status: 404 });
  }

  const ext = path.extname(group.passportFilename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(bytes.length),
    },
  });
}
