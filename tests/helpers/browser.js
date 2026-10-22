const { chromium } = require('playwright');
const fs = require('node:fs');

// CHROMIUM_PATH points at an installed Chromium; without it Playwright uses the one it installed.
exports.launch = () => chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
exports.axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// Accessibility violations on the page as it is now (WCAG 2.0/2.1 A and AA); an empty list is a pass.
exports.axeViolations = async (page) => {
  await page.evaluate(exports.axeSource);
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((x) => x.id + ':' + x.nodes.length));
};
