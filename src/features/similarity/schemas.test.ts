import { describe, expect, it } from 'vitest';
import { similaritySchema } from './schemas';
import { geminiSimilarityFixture, similarityFixture } from './fixtures.test-support';

describe('similarity response boundary', () => {
  it('accepts a complete classical response unchanged', () => {
    expect(similaritySchema.parse(similarityFixture())).toEqual(similarityFixture());
  });
  it('accepts Gemini results and one run with papers in response order', () => {
    const fixture = geminiSimilarityFixture();
    expect(similaritySchema.parse(fixture)).toEqual(fixture);
  });
  it.each([-1, 0, 1])('accepts Gemini cosine %s', (score) => {
    const fixture = geminiSimilarityFixture();
    fixture.pairs[0]!.results[4]!.score = score;
    expect(similaritySchema.safeParse(fixture).success).toBe(true);
  });
  it.each([
    (f: ReturnType<typeof geminiSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'gemini-embeddings' ? { ...r, score: -1.01 } : r) })) }),
    (f: ReturnType<typeof geminiSimilarityFixture>) => ({ ...f, embeddingRuns: f.embeddingRuns.map((r) => ({ ...r, papers: r.papers.map((p) => ({ ...p, source: 'generated' })) })) }),
  ])('rejects incompatible Gemini data %#', (change) => {
    expect(similaritySchema.safeParse(change(geminiSimilarityFixture())).success).toBe(false);
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
