// El Centro 1940 — the classic corrected record distributed by vibrationdata.com, both horizontal components.
// Tries the original URLs first, then the Internet Archive snapshots of the same files.
// Verifies N–S: 2688 points, dt 0.02 s, peak 0.349 g; E–W: 2674 points, dt 0.02 s, peak 0.214 g.
// Stops with an error on any mismatch. Run: node scripts/fetch-elcentro.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../public/records/elcentro-ns.json', import.meta.url);

async function download(name) {
  const sources = [
    `http://www.vibrationdata.com/${name}`,
    `https://web.archive.org/web/2021id_/http://www.vibrationdata.com/${name}`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { text: await res.text(), url };
    } catch (e) {
      console.warn(`${url}: ${e.message}`);
    }
  }
  throw new Error(`${name} unavailable from every source`);
}

function parse({ text, url }, expected) {
  const t = [], a = [];
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/).map(Number);
    if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) { t.push(p[0]); a.push(p[1]); }
  }
  const dt = Math.round((t[1] - t[0]) * 1e6) / 1e6;
  const peak = Math.max(...a.map(Math.abs));
  const uniform = t.every((ti, i) => Math.abs(ti - i * dt) < 1e-6);
  if (a.length !== expected.n || dt !== 0.02 || !uniform || Math.abs(peak - expected.peak) > 0.001) {
    throw new Error(`unexpected record ${url}: n=${a.length} dt=${dt} uniform=${uniform} peak=${peak}`);
  }
  return { a, dt, peak, url };
}

const ns = parse(await download('elcentro_NS.dat'), { n: 2688, peak: 0.349 });
const ew = parse(await download('elcentro_EW.dat'), { n: 2674, peak: 0.214 });
// Both start at t = 0 with the same step; the E–W file is 0.28 s shorter and is padded with zeros at the end.
const ew2 = [...ew.a, ...Array(ns.a.length - ew.a.length).fill(0)];

mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  id: 'elcentro-ns',
  name: 'El Centro, 1940',
  dt: ns.dt,
  accelG: ns.a,
  peakG: ns.peak,
  accelG2: ew2,
  peakG2: ew.peak,
  components: ['N–S', 'E–W'],
  source: `vibrationdata.com → PEER (CIT-SMARTS, corrected); downloaded from ${ns.url} and ${ew.url}`,
  citation: 'Imperial Valley (El Centro) 1940-05-19, Mw 6.9, N–S and E–W components',
  note: 'License not stated on the page; used for educational purposes with attribution. E–W padded with zeros to the N–S length (0.28 s).',
}));
console.log(`wrote ${OUT.pathname}: N–S ${ns.a.length} pts peak ${ns.peak} g, E–W ${ew.a.length} pts peak ${ew.peak} g`);
