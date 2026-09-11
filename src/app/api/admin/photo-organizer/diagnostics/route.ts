import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
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

  // The path/network checks above all came back clean, yet a real OCR run
  // still times out -- so the next suspect is worker_threads.Worker
  // spawning itself (what tesseract.js's Node adapter actually uses, per
  // its own spawnWorker.js, despite that file's misleading "using
  // child_process" header comment) silently hanging under whatever
  // process/thread quota Passenger's managed environment enforces here --
  // this host has a long history this session of exactly that kind of
  // resource ceiling (pm2 crash-loop fork exhaustion, "Resource
  // temporarily unavailable" during builds). Attempt a real worker
  // creation with a logger attached and a short timeout, and report
  // exactly which (if any) lifecycle events fired before it either
  // finished or ran out of time -- zero events means the worker thread
  // itself never came up; a "loading language traineddata" event with no
  // completion means the earlier path-resolution work is where it's still
  // stuck despite the checks above.
  const workerEvents: { t: number; status: string; progress: number }[] = [];
  const workerStartedAt = Date.now();
  let workerOutcome: { ok: boolean; ms: number; error?: string };
  try {
    const workerPromise = createWorker("eng", 1, {
      cachePath: resolvedDir,
      logger: (m) => workerEvents.push({ t: Date.now() - workerStartedAt, status: m.status, progress: m.progress }),
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("diagnostic worker creation timed out after 15s")), 15_000)
    );
    const worker = await Promise.race([workerPromise, timeoutPromise]);
    workerOutcome = { ok: true, ms: Date.now() - workerStartedAt };
    // @ts-expect-error -- tesseract.js's Worker type does have terminate()
    await worker.terminate().catch(() => {});
  } catch (err) {
    workerOutcome = { ok: false, ms: Date.now() - workerStartedAt, error: err instanceof Error ? err.message : String(err) };
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
    workerOutcome,
    workerEvents,
  });
}
