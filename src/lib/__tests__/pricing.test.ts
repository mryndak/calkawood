import { describe, it, expect } from 'vitest';
import { DEFAULT_PRICING, parsePricing, estimateRange } from '@/lib/estimate';

describe('parsePricing', () => {
  it('akceptuje wartości domyślne (także po round-tripie przez JSON)', () => {
    expect(parsePricing(JSON.parse(JSON.stringify(DEFAULT_PRICING)))).toEqual(DEFAULT_PRICING);
  });

  it('odrzuca dolną stawkę wyższą od górnej, wartości <= 0 i NaN', () => {
    const bad = (mut: (p: any) => void) => {
      const p = JSON.parse(JSON.stringify(DEFAULT_PRICING));
      mut(p);
      return parsePricing(p);
    };
    expect(bad((p) => (p.rates.taras = [900, 500]))).toBeNull();
    expect(bad((p) => (p.rates.taras = [0, 500]))).toBeNull();
    expect(bad((p) => (p.multipliers.dab = NaN))).toBeNull();
    expect(parsePricing(null)).toBeNull();
  });
});

describe('estimateRange z własnym cennikiem', () => {
  it('używa przekazanych stawek i mnożników', () => {
    const pricing = JSON.parse(JSON.stringify(DEFAULT_PRICING));
    pricing.rates.taras = [1000, 2000];
    pricing.multipliers.modrzew = 2;
    expect(estimateRange('taras', 10, 'modrzew', pricing)).toEqual({ low: 20000, high: 40000 });
  });
});
