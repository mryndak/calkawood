// Wzór widełek cenowych kreatora wyceny — wg handoffu (README, sekcja „Wzór wyceny”).
// Stawki robocze z 2026 r., do weryfikacji przez klienta przed publikacją.

export const SERVICE_TYPES = ['domy', 'sauna', 'taras', 'zadaszenie', 'wnetrza'] as const;
export type EstimateService = (typeof SERVICE_TYPES)[number];

export const MATERIALS = ['sosna', 'modrzew', 'kompozyt', 'dab'] as const;
export type EstimateMaterial = (typeof MATERIALS)[number];

export const TERMS = ['asap', '1-3', '3-6', 'orient'] as const;
export type EstimateTerm = (typeof TERMS)[number];

export const MIN_AREA = 10;
export const MAX_AREA = 250;
export const AREA_STEP = 2;

// [dolna, górna] stawka zł/m²
const BASE_RATES: Record<EstimateService, [number, number]> = {
  domy: [3400, 5200],
  sauna: [3900, 6200],
  taras: [520, 880],
  zadaszenie: [680, 1150],
  wnetrza: [420, 780],
};

const MATERIAL_MULTIPLIER: Record<EstimateMaterial, number> = {
  sosna: 1,
  modrzew: 1.28,
  kompozyt: 1.15,
  dab: 1.5,
};

export const SERVICE_LABELS: Record<EstimateService, string> = {
  domy: 'Dom drewniany',
  sauna: 'Sauna',
  taras: 'Taras',
  zadaszenie: 'Zadaszenie / pergola',
  wnetrza: 'Podłogi i wnętrza',
};

export const MATERIAL_LABELS: Record<EstimateMaterial, string> = {
  sosna: 'Sosna klejona',
  modrzew: 'Modrzew syberyjski',
  kompozyt: 'Kompozyt WPC',
  dab: 'Dąb / drewno egzotyczne',
};

export const TERM_LABELS: Record<EstimateTerm, string> = {
  asap: 'Jak najszybciej',
  '1-3': 'W ciągu 1–3 miesięcy',
  '3-6': 'W ciągu 3–6 miesięcy',
  orient: 'Tylko orientacyjnie, planuję',
};

export function round500(value: number): number {
  return Math.round(value / 500) * 500;
}

export function formatPLN(value: number): string {
  return `${round500(value).toLocaleString('pl-PL')} zł`;
}

export interface EstimateRange {
  low: number;
  high: number;
}

export function estimateRange(
  service: EstimateService,
  area: number,
  material: EstimateMaterial
): EstimateRange {
  const [low, high] = BASE_RATES[service];
  const multiplier = MATERIAL_MULTIPLIER[material];
  return {
    low: round500(low * area * multiplier),
    high: round500(high * area * multiplier),
  };
}

export function formatEstimateRange(range: EstimateRange): string {
  return `${round500(range.low).toLocaleString('pl-PL')} – ${round500(range.high).toLocaleString('pl-PL')} zł`;
}
