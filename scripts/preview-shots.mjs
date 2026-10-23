// Takes pictures of the main pages of a running copy of the site (see .github/workflows/preview.yml).
//
//   PREVIEW_BASE_URL   the site to photograph (default http://localhost:3100)
//   PREVIEW_OUT        the folder for the pictures (default ./preview-screens)
//   PREVIEW_PASSWORD   the password of the demo accounts made by scripts/preview-seed.mjs
//   CHROMIUM_PATH      an installed Chromium to use instead of Playwright's own (optional)
//
// Public pages, a signed-in buyer and a signed-in admin, at phone size (375 px) and laptop size (1280 px), in English,
// Russian and Chinese. Exits with an error when a page cannot be opened, so a broken change shows up as a failed run.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.PREVIEW_BASE_URL || "http://localhost:3100";
const out = path.resolve(process.env.PREVIEW_OUT || "preview-screens");
const password = process.env.PREVIEW_PASSWORD;
if (!password) {
  console.error("PREVIEW_PASSWORD is not set");
  process.exit(1);
}

const LOCALES = ["en", "ru", "zh"];
const SIZES = { phone: { width: 375, height: 800 }, laptop: { width: 1280, height: 900 } };
const PAGES = {
  public: ["", "/exhibitions", "/exhibitions/preview-canton-demo", "/login"],
  buyer: ["/dashboard", "/dashboard/buyer", "/dashboard/notifications"],
  admin: ["/admin", "/admin/registrations", "/admin/buyer-profiles", "/admin/insights", "/admin/duplicates", "/admin/scheduled-exports", "/admin/staff-access"],
};
const ACCOUNTS = { buyer: "preview-buyer@preview.invalid", admin: "preview-admin@preview.invalid" };

async function signIn(email) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` },
    body: JSON.stringify({ email, password }),
  });
  const token = /token=([^;]+)/.exec(res.headers.getSetCookie().join(";"))?.[1];
  if (!res.ok || !token) throw new Error(`Could not sign in as ${email} (${res.status})`);
  return token;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const failures = [];
let taken = 0;
fs.mkdirSync(out, { recursive: true });

for (const [who, paths] of Object.entries(PAGES)) {
  const token = who === "public" ? null : await signIn(ACCOUNTS[who]);
  for (const [sizeName, viewport] of Object.entries(SIZES)) {
    const context = await browser.newContext({ viewport });
    if (token) await context.addCookies([{ name: "token", value: token, url: base }]);
    const page = await context.newPage();
    for (const locale of LOCALES) {
      for (const p of paths) {
        const url = `${base}/${locale}${p}`;
        const file = path.join(out, `${who}-${sizeName}-${locale}${p.replace(/\//g, "_") || "_home"}.png`);
        try {
          const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
          if (!response || response.status() >= 400) throw new Error(`status ${response?.status()}`);
          // Let the page settle (data loaded, transitions finished) before the picture.
          await page.waitForTimeout(700);
          await page.screenshot({ path: file, fullPage: sizeName === "phone" });
          taken += 1;
        } catch (err) {
          failures.push(`${url}: ${err.message}`);
        }
      }
    }
    await context.close();
  }
}
await browser.close();

console.log(`${taken} pictures in ${out}`);
if (failures.length > 0) {
  console.error(`${failures.length} pages could not be opened:\n${failures.join("\n")}`);
  process.exit(1);
}
