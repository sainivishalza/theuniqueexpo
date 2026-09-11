import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { findTessdataDir, TESSDATA_FILE_RELATIVE } from "@/lib/server/photo-organizer/ocr";

// TEMPORARY: direct ground truth from the actual live serving process for
// the OCR-hang investigation -- the "resolved tessdata dir" log added
// earlier only ever fires during `next build`'s own trace step (which runs
// under the build's cwd, not necessarily the real runtime process's), so
// it couldn't actually confirm anything about production. This calls the
// same path-resolution + existence checks a real OCR run would, from
// within a real request to the real serving process, plus a short-timeout
// probe of the CDN tesseract.js would fall back to on a cache miss -- so a
// still-failing OCR run finally comes with real evidence instead of
// another guess. Remove once the root cause is confirmed and fixed.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const resolvedDir = findTessdataDir();
  const resolvedFile = path.join(resolvedDir, "eng.traineddata");

  let fileStat: { exists: boolean; size?: number; mode?: string; error?: string } = { exists: false };
  try {
    const st = fs.statSync(resolvedFile);
    fileStat = { exists: true, size: st.size, mode: (st.mode & 0o777).toString(8) };
  } catch (err) {
    fileStat = { exists: false, error: err instanceof Error ? err.message : String(err) };
  }

  const candidates: Record<string, boolean> = {};
  const bases = [process.cwd(), __dirname, path.dirname(process.cwd())];
  for (const base of bases) {
    candidates[path.join(base, TESSDATA_FILE_RELATIVE)] = fs.existsSync(path.join(base, TESSDATA_FILE_RELATIVE));
  }

  let cdnReachable: { ok: boolean; status?: number; error?: string; ms?: number };
  const cdnUrl = "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz";
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(cdnUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    cdnReachable = { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    cdnReachable = { ok: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - started };
  }

  return NextResponse.json({
    processCwd: process.cwd(),
    dirname: __dirname,
    resolvedDir,
    resolvedFile,
    fileStat,
    candidates,
    cdnReachable,
    nodeVersion: process.version,
    platform: process.platform,
  });
}
