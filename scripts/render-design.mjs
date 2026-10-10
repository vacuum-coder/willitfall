// Headless render of a design mockup: node scripts/render-design.mjs <html> <png> <w> <h>
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const [, , file, out, w = '1440', h = '900', dpr = '1'] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errors = [];
page.on('console', m => {
  if (m.type() === 'error') errors.push('console.error: ' + m.text());
  if (m.type() === 'warning') errors.push('console.warn: ' + m.text());
});
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')));
await page.goto(pathToFileURL(file).href + '?still', { waitUntil: 'networkidle', timeout: 90000 });
const ok = await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 }).then(() => true).catch(() => false);
if (!ok) errors.push('window.__ready never became true');
await page.waitForTimeout(1500);
const info = await page.evaluate(() => window.__info || null);
await page.screenshot({ path: out, timeout: 120000 });
console.log(JSON.stringify({ errors, info }, null, 1));
await browser.close();
