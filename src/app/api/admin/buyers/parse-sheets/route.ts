import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { parseBuyerWorkbooks } from "@/lib/server/buyer-sheet-parser";

// Reads the Excel file(s) an admin uploads and returns the buyers to import
// plus the review lists. Nothing is saved: the import itself is a separate
// step (/api/admin/buyers/import).

const MAX_FILES = 6;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }
  const uploads = form.getAll("files").filter((f): f is File => typeof f !== "string");
  if (uploads.length === 0) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (uploads.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time` }, { status: 400 });

  const files: { name: string; data: Buffer }[] = [];
  for (const file of uploads) {
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: `${file.name} is too large (max 15 MB)` }, { status: 400 });
    files.push({ name: file.name, data: Buffer.from(await file.arrayBuffer()) });
  }

  try {
    return NextResponse.json(await parseBuyerWorkbooks(files));
  } catch (err) {
    console.error("Reading buyer workbook failed:", err);
    return NextResponse.json({ error: "This does not look like an Excel (.xlsx) file, or it is damaged" }, { status: 422 });
  }
}
