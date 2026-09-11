import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { requireAdmin } from "@/lib/auth-server";
import {
  createOcrWorker,
  findTessdataDir,
  TESSDATA_FILE_RELATIVE,
  TESSDATA_RELATIVE,
  WORKER_SCRIPT_PATH,
} from "@/lib/server/photo-organizer/ocr";

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

  // The fixed workerPath resolution (using this same app-root-walking
  // approach) came back `null` in production -- meaning it couldn't find
  // node_modules/tesseract.js/src/worker-script/node/index.js anywhere
  // within 10 levels of process.cwd()/__dirname, even though the sibling
  // tessdata file resolves fine from the same root. Check every level of
  // that specific path directly to find exactly which segment goes
  // missing (whole node_modules dir? tesseract.js package? just its src/
  // subtree? -- e.g. if only compiled dist/ files got shipped for this
  // install) instead of guessing further.
  let appRoot = resolvedDir;
  for (let i = 0; i < TESSDATA_RELATIVE.split(path.sep).length; i++) appRoot = path.dirname(appRoot);
  const nodeModulesChecks: Record<string, boolean> = {};
  const nmSegments = ["node_modules", "node_modules/tesseract.js", "node_modules/tesseract.js/src", "node_modules/tesseract.js/src/worker-script", "node_modules/tesseract.js/src/worker-script/node", "node_modules/tesseract.js/src/worker-script/node/index.js", "node_modules/tesseract.js/src/worker", "node_modules/tesseract.js/src/worker/node", "node_modules/tesseract.js/src/worker/node/defaultOptions.js", "node_modules/tesseract.js/package.json"];
  for (const seg of nmSegments) {
    nodeModulesChecks[seg] = fs.existsSync(path.join(appRoot, ...seg.split("/")));
  }
  let tesseractPackageJson: { version?: string; main?: string; error?: string } = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, "node_modules", "tesseract.js", "package.json"), "utf8"));
    tesseractPackageJson = { version: pkg.version, main: pkg.main };
  } catch (err) {
    tesseractPackageJson = { error: err instanceof Error ? err.message : String(err) };
  }
  let tesseractDirListing: string[] | { error: string };
  try {
    tesseractDirListing = fs.readdirSync(path.join(appRoot, "node_modules", "tesseract.js"));
  } catch (err) {
    tesseractDirListing = { error: err instanceof Error ? err.message : String(err) };
  }
  let tesseractSrcListing: string[] | { error: string };
  try {
    tesseractSrcListing = fs.readdirSync(path.join(appRoot, "node_modules", "tesseract.js", "src"));
  } catch (err) {
    tesseractSrcListing = { error: err instanceof Error ? err.message : String(err) };
  }

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

  // UPDATE: the explicit-workerPath fix did NOT resolve the hang -- it
  // came back identical to the unfixed default (15s timeout either way),
  // and resolvedWorkerScriptPath came back null, meaning our own
  // app-root-walking search couldn't find node_modules/tesseract.js's
  // worker-script file either. The nodeModulesChecks/tesseractDirListing
  // captured above are what's answering *why* -- whatever segment of that
  // path is missing is where the real problem is. A plain real file spawn
  // (fileWorkerOutcome, above) works fine, so this isn't "file-path
  // spawning is broken," it's specifically about this one dependency's
  // files. Kept both the fixed and unfixed createWorker() calls below for
  // continued side-by-side confirmation once the real cause is fixed.
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
    appRoot,
    nodeModulesChecks,
    tesseractPackageJson,
    tesseractDirListing,
    tesseractSrcListing,
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
