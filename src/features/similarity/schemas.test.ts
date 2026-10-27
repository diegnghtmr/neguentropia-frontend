import { describe, expect, it } from 'vitest';
import { similaritySchema } from './schemas';
import { similarityFixture } from './fixtures.test-support';

describe('similarity response boundary', () => {
  it('accepts a complete classical response unchanged', () => {
    expect(similaritySchema.parse(similarityFixture())).toEqual(similarityFixture());
  });
  it('accepts all 190 pairs for the full catalog', () => {
    const f = similarityFixture();
    const paperIds = Array.from({ length: 20 }, (_, i) => `paper-${i + 1}`);
    const pairs = paperIds.flatMap((left, i) => paperIds.slice(i + 1).map((right) => ({ left, right, results: f.pairs[0]!.results })));
    expect(similaritySchema.parse({ ...f, paperIds, pairs }).pairs).toHaveLength(190);
  });
  it.each([
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, corpusVersion: 'v1' }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, methods: ['wrong-method'] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, embeddingRuns: [{}] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, paperIds: ['paper-1', 'paper-1'] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, pairs: [] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => ({ ...r, score: 1.1 })) })) }),
  ])('rejects incompatible data %#', (change) => {
    expect(similaritySchema.safeParse(change(similarityFixture())).success).toBe(false);
  });
});
