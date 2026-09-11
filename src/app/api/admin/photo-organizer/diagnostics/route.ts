import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { requireAdmin } from "@/lib/auth-server";
import { createOcrWorker, findTessdataDir, TESSDATA_FILE_RELATIVE, WORKER_SCRIPT_PATH } from "@/lib/server/photo-organizer/ocr";

// Zero worker_threads.Worker lifecycle events ever fired in the previous
// diagnostic run (15s timeout, nothing) -- the thread spawn itself is the
// actual hang, unrelated to file paths or CDN reachability (both already
// confirmed fine). Read what the OS thinks this process's resource
// standing is at the exact moment of that attempt, since this host has a
// documented history this session of process/fork/thread quota exhaustion.
function readProcSelfStatus(): Record<string, string> {
  try {
    const text = fs.readFileSync("/proc/self/status", "utf8");
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) out[key.trim()] = rest.join(":").trim();
    }
    return out;
  } catch {
    return {};
  }
}

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
  // Isolates whether it's specifically tesseract.js's (larger, WASM-loading)
  // worker script that hangs, or whether *any* worker_threads.Worker spawn
  // hangs on this host regardless of what it runs -- a trivial inline
  // worker that does nothing but immediately message back rules the whole
  // worker_threads mechanism in or out independent of tesseract.js entirely.
  const bareWorkerStartedAt = Date.now();
  let bareWorkerOutcome: { ok: boolean; ms: number; error?: string };
  try {
    const result = await Promise.race([
      new Promise((resolve, reject) => {
        const w = new Worker("require('worker_threads').parentPort.postMessage('pong')", { eval: true });
        w.once("message", (msg) => {
          w.terminate().catch(() => {});
          resolve(msg);
        });
        w.once("error", reject);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("bare worker timed out after 10s")), 10_000)),
    ]);
    bareWorkerOutcome = { ok: result === "pong", ms: Date.now() - bareWorkerStartedAt };
  } catch (err) {
    bareWorkerOutcome = { ok: false, ms: Date.now() - bareWorkerStartedAt, error: err instanceof Error ? err.message : String(err) };
  }

  // The "fixed" workerPath test (below) still hangs identically to the
  // unfixed one -- same 15s timeout, zero difference -- which rules out
  // "wrong path inside tesseract.js" as the (sole) explanation, since an
  // explicitly-correct, directly-verified path produces the exact same
  // symptom. The one variable never isolated yet: the working bare-worker
  // test above uses `{ eval: true }` (a string executed in-process, no
  // file I/O), while every tesseract.js worker -- fixed or not -- is
  // spawned from a real file path, which requires the new thread to open
  // and read a file off disk and run it through Node's module resolution.
  // Write a trivial real .js file to disk and spawn *that* by path (still
  // nothing to do with tesseract.js) to isolate "spawning from a file path
  // is itself broken on this host" from "tesseract.js's specific files are
  // wrong/broken".
  let fileWorkerOutcome: { ok: boolean; ms: number; error?: string; scriptPath?: string };
  const fileWorkerScriptPath = path.join(os.tmpdir(), "diag-file-worker-test.js");
  const fileWorkerStartedAt = Date.now();
  try {
    fs.writeFileSync(fileWorkerScriptPath, "require('worker_threads').parentPort.postMessage('pong');\n");
    const result = await Promise.race([
      new Promise((resolve, reject) => {
        const w = new Worker(fileWorkerScriptPath);
        w.once("message", (msg) => {
          w.terminate().catch(() => {});
          resolve(msg);
        });
        w.once("error", reject);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("file-based worker timed out after 10s")), 10_000)),
    ]);
    fileWorkerOutcome = { ok: result === "pong", ms: Date.now() - fileWorkerStartedAt, scriptPath: fileWorkerScriptPath };
  } catch (err) {
    fileWorkerOutcome = {
      ok: false,
      ms: Date.now() - fileWorkerStartedAt,
      error: err instanceof Error ? err.message : String(err),
      scriptPath: fileWorkerScriptPath,
    };
  } finally {
    fs.rmSync(fileWorkerScriptPath, { force: true });
  }

  // ROOT CAUSE FOUND: a previous diagnostic run's require.resolve() probe
  // against a tesseract.js source file returned a bare webpack module
  // *number* instead of a real path -- proof Next's server build bundles
  // tesseract.js's Node code into this app's own webpack chunk (its
  // package.json has a "browser" field, which is what triggers Next's
  // bundle-instead-of-externalize heuristic). That means `__dirname`
  // inside tesseract.js's own defaultOptions.js (evaluated as part of that
  // bundled chunk) no longer points at its real on-disk location under
  // node_modules/tesseract.js -- so the workerPath it silently computes
  // for `new Worker(workerPath)` is wrong, and a worker thread given a
  // bundler-relocated bogus path doesn't error, it just spawns and does
  // nothing -- exactly the "zero lifecycle events, hangs forever" symptom.
  // ocr.ts now computes workerPath itself (same proven directory-walking
  // approach as findTessdataDir) and passes it to createWorker() explicitly,
  // bypassing tesseract.js's broken default entirely. Test the *real* fixed
  // function directly, alongside the old unfixed default-resolution call,
  // for a clear before/after.
  const resourcesBefore = readProcSelfStatus();

  const unfixedWorkerEvents: { t: number; status: string; progress: number }[] = [];
  const unfixedStartedAt = Date.now();
  let unfixedWorkerOutcome: { ok: boolean; ms: number; error?: string };
  try {
    const workerPromise = createWorker("eng", 1, {
      cachePath: resolvedDir,
      logger: (m) => unfixedWorkerEvents.push({ t: Date.now() - unfixedStartedAt, status: m.status, progress: m.progress }),
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("unfixed diagnostic worker creation timed out after 15s")), 15_000)
    );
    const worker = await Promise.race([workerPromise, timeoutPromise]);
    unfixedWorkerOutcome = { ok: true, ms: Date.now() - unfixedStartedAt };
    // @ts-expect-error -- tesseract.js's Worker type does have terminate()
    await worker.terminate().catch(() => {});
  } catch (err) {
    unfixedWorkerOutcome = { ok: false, ms: Date.now() - unfixedStartedAt, error: err instanceof Error ? err.message : String(err) };
  }

  const fixedStartedAt = Date.now();
  let fixedWorkerOutcome: { ok: boolean; ms: number; error?: string };
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("fixed diagnostic worker creation timed out after 15s")), 15_000)
    );
    const worker = await Promise.race([createOcrWorker(), timeoutPromise]);
    fixedWorkerOutcome = { ok: true, ms: Date.now() - fixedStartedAt };
    // @ts-expect-error -- tesseract.js's Worker type does have terminate()
    await worker.terminate().catch(() => {});
  } catch (err) {
    fixedWorkerOutcome = { ok: false, ms: Date.now() - fixedStartedAt, error: err instanceof Error ? err.message : String(err) };
  }

  const resourcesAfter = readProcSelfStatus();

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
    unfixedWorkerOutcome,
    unfixedWorkerEvents,
    bareWorkerOutcome,
    fileWorkerOutcome,
    resolvedWorkerScriptPath: WORKER_SCRIPT_PATH,
    resolvedWorkerScriptPathExists: WORKER_SCRIPT_PATH ? fs.existsSync(WORKER_SCRIPT_PATH) : false,
    fixedWorkerOutcome,
    resources: {
      threadsBefore: resourcesBefore["Threads"],
      threadsAfter: resourcesAfter["Threads"],
      vmRSS: resourcesAfter["VmRSS"],
      voluntaryCtxtSwitches: resourcesAfter["voluntary_ctxt_switches"],
      nonvoluntaryCtxtSwitches: resourcesAfter["nonvoluntary_ctxt_switches"],
      osFreeMemMB: Math.round(os.freemem() / 1024 / 1024),
      osTotalMemMB: Math.round(os.totalmem() / 1024 / 1024),
      osLoadavg: os.loadavg(),
      osCpuCount: os.cpus().length,
    },
  });
}
