// El Centro 1940, N–S component — the classic corrected record distributed by vibrationdata.com.
// Tries the original URL first, then the Internet Archive snapshot of the same file.
// Verifies 2688 points, dt = 0.02 s and peak 0.349 g; stops with an error on any mismatch.
// Run: node scripts/fetch-elcentro.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const SOURCES = [
  'http://www.vibrationdata.com/elcentro_NS.dat',
  'https://web.archive.org/web/20210510164403id_/http://www.vibrationdata.com/elcentro_NS.dat',
];
const OUT = new URL('../public/records/elcentro-ns.json', import.meta.url);

let text, used;
for (const url of SOURCES) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
    used = url;
    break;
  } catch (e) {
    console.warn(`${url}: ${e.message}`);
  }
}
if (!text) throw new Error('El Centro record unavailable from every source');

const t = [], a = [];
for (const line of text.split(/\r?\n/)) {
  const p = line.trim().split(/\s+/).map(Number);
  if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) { t.push(p[0]); a.push(p[1]); }
}
const dt = Math.round((t[1] - t[0]) * 1e6) / 1e6;
const peak = Math.max(...a.map(Math.abs));
const uniform = t.every((ti, i) => Math.abs(ti - i * dt) < 1e-6);
if (a.length !== 2688 || dt !== 0.02 || !uniform || Math.abs(peak - 0.349) > 0.001) {
  throw new Error(`unexpected record: n=${a.length} dt=${dt} uniform=${uniform} peak=${peak}`);
}

mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  id: 'elcentro-ns',
  name: 'El Centro, 1940',
  dt,
  accelG: a,
  peakG: peak,
  source: `vibrationdata.com → PEER (CIT-SMARTS, corrected); downloaded from ${used}`,
  citation: 'Imperial Valley (El Centro) 1940-05-19, Mw 6.9, N–S component',
  note: 'License not stated on the page; used for educational purposes with attribution.',
}));
console.log(`wrote ${OUT.pathname}: ${a.length} points, dt ${dt} s, peak ${peak} g (${used})`);
