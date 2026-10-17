import { describe, expect, it } from 'vitest';
import { rankingSchema } from './schemas';
import { rankingFixture } from './fixtures.test-support';

describe('ranking response boundary', () => {
  it('accepts and preserves the complete response without transforms', () => {
    const fixture = rankingFixture();
    expect(rankingSchema.parse(fixture)).toEqual(fixture);
  });
  it.each([
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, extra: true }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, preprocessing: { ...f.preprocessing, extra: true } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, extra: true } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.map((r) => ({ ...r, extra: true })) }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.map((r) => ({ ...r, topTerms: r.topTerms.map((t) => ({ ...t, extra: true })) })) }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: [...f.results].reverse() }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.slice(1) }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.map((r) => ({ ...r, topTerms: Array.from({ length: 16 }, () => r.topTerms[0]) })) }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, scope: 'titles' }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, paperCount: 19 }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, radixBase: 2 } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, bucketStrategy: 'comparison' } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, preprocessing: { ...f.preprocessing, stopwordsRemoved: true } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.map((r) => ({ ...r, sortMilliseconds: -1 })) }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, distinctTermCount: 4 }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, bucketCount: 0, bucketWidth: 0 } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, bucketCount: 2 } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, parameters: { ...f.parameters, bucketWidth: 11 } }),
    (f: ReturnType<typeof rankingFixture>) => ({ ...f, results: f.results.map((r, i) => ({ ...r, topTerms: i === 1 ? [...r.topTerms].reverse() : r.topTerms })) }),
  ])('rejects incompatible response %#', (change) => {
    expect(rankingSchema.safeParse(change(rankingFixture())).success).toBe(false);
  });
  it('accepts exactly fifteen terms and keeps their first-occurrence tie order', () => {
    const f = rankingFixture();
    const topTerms = Array.from({ length: 15 }, (_, i) => ({ term: `term-${15 - i}`, frequency: 1 }));
    const complete = { ...f, totalTokenCount: 15, distinctTermCount: 15, maxFrequency: 1,
      parameters: { ...f.parameters, bucketCount: 3, bucketWidth: 1 },
      results: f.results.map((r) => ({ ...r, topTerms })),
    };
    expect(rankingSchema.parse(complete)).toEqual(complete);
  });
  it('accepts the empty mathematical case without fabricating terms', () => {
    const f = rankingFixture();
    expect(rankingSchema.safeParse({ ...f, totalTokenCount: 0, distinctTermCount: 0, maxFrequency: 0,
      parameters: { ...f.parameters, bucketCount: 0, bucketWidth: 0 },
      results: f.results.map((r) => ({ ...r, topTerms: [], sortMilliseconds: 0 })),
    }).success).toBe(true);
  });
  it('rejects bucket parameters on an empty vocabulary', () => {
    const f = rankingFixture();
    expect(rankingSchema.safeParse({ ...f, totalTokenCount: 0, distinctTermCount: 0, maxFrequency: 0,
      parameters: { ...f.parameters, bucketCount: 1, bucketWidth: 1 },
      results: f.results.map((r) => ({ ...r, topTerms: [], sortMilliseconds: 0 })),
    }).success).toBe(false);
  });
});
