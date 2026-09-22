// Real accelerograms shipped in public/records (provenance in README «Записи землетрясений»).

export interface RecordInfo { id: string; label: string; short: string }

export const RECORDS: RecordInfo[] = [
  { id: 'elcentro-ns', label: 'El Centro, 1940', short: 'El Centro 1940' },
  { id: 'almaty-2024-kndc', label: 'Алматы, 23.01.2024', short: 'Алматы 2024' },
];

/** Almaty's design seismicity (СП РК 2.03-30-2017; microzoning map 2021 — zones 9 and 10). */
export const CITY_DESIGN_INTENSITY = 9;
