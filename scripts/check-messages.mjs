// Guards against two bugs that have shipped before:
//  1. A page uses a translation namespace its layout never sends to the
//     browser (admin/dashboard/server-only namespaces are split out in
//     src/lib/client-message-namespaces.ts), so visitors saw raw keys such as
//     "adminSlideshow.editButton".
//  2. en/ru/zh message files drifting apart (a key missing in one language).
// Run with: npm run check:messages   (exits 1 if anything is wrong)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), "utf8");

const nsSrc = read("src/lib/client-message-namespaces.ts");
const listOf = (name) => {
  const m = nsSrc.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`));
  return new Set([...(m ? m[1].matchAll(/"(\w+)"/g) : [])].map((x) => x[1]));
};
const ADMIN = listOf("ADMIN_NAMESPACES");
const DASHBOARD = listOf("DASHBOARD_NAMESPACES");
const SERVER_ONLY = listOf("SERVER_ONLY_NAMESPACES");

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk(join(root, "src"))) {
  const rel = file.slice(root.length);
  const src = readFileSync(file, "utf8");
  // Client code only: server components read messages directly.
  const isClient = /^\s*(['"])use client\1/m.test(src.slice(0, 200));
  const area = rel.includes("/admin/") ? "admin" : rel.includes("/dashboard/") ? "dashboard" : "public";
  for (const m of src.matchAll(/useTranslations\(\s*"([\w.]+)"\s*\)/g)) {
    const ns = m[1].split(".")[0];
    // Each route area's provider only carries its own namespaces (plus
    // "common"); shared components outside admin/dashboard get the root one,
    // which leaves admin, dashboard and server-only namespaces out.
    if (area === "admin" && !ADMIN.has(ns) && ns !== "common") problems.push(`${rel}: "${ns}" is not in ADMIN_NAMESPACES, so the admin provider doesn't send it (raw keys on screen)`);
    if (area === "dashboard" && !DASHBOARD.has(ns) && ns !== "common") problems.push(`${rel}: "${ns}" is not in DASHBOARD_NAMESPACES, so the dashboard provider doesn't send it (raw keys on screen)`);
    if (area === "public" && (ADMIN.has(ns) || DASHBOARD.has(ns))) problems.push(`${rel}: admin/dashboard namespace "${ns}" used outside /admin or /dashboard (root provider omits it)`);
    if (SERVER_ONLY.has(ns) && isClient) problems.push(`${rel}: server-only namespace "${ns}" used in a client component`);
  }
}

// en/ru/zh key parity
const flat = (o, prefix = "", out = new Set()) => {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out);
    else out.add(key);
  }
  return out;
};
const langs = {};
for (const l of ["en", "ru", "zh"]) langs[l] = flat(JSON.parse(read(`messages/${l}.json`)));
for (const l of ["ru", "zh"]) {
  const missing = [...langs.en].filter((k) => !langs[l].has(k));
  const extra = [...langs[l]].filter((k) => !langs.en.has(k));
  if (missing.length) problems.push(`messages/${l}.json is missing ${missing.length} key(s) that en.json has, e.g. ${missing.slice(0, 5).join(", ")}`);
  if (extra.length) problems.push(`messages/${l}.json has ${extra.length} key(s) not in en.json, e.g. ${extra.slice(0, 5).join(", ")}`);
}

if (problems.length) {
  console.error("Message check failed:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("Message check passed: namespaces reach the pages that use them, and en/ru/zh have the same keys.");
