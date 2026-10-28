import { describe, expect, it } from 'vitest';
import { similaritySchema } from './schemas';
import { geminiSimilarityFixture, localSimilarityFixture, similarityFixture } from './fixtures.test-support';

describe('similarity response boundary', () => {
  it('accepts a complete classical response unchanged', () => {
    expect(similaritySchema.parse(similarityFixture())).toEqual(similarityFixture());
  });
  it('accepts Gemini results with model and dimension', () => {
    const fixture = geminiSimilarityFixture();
    expect(similaritySchema.parse(fixture)).toEqual(fixture);
  });
  it.each([-1, 0, 1])('accepts Gemini cosine %s', (score) => {
    const fixture = geminiSimilarityFixture();
    fixture.pairs[0]!.results[4]!.score = score;
    expect(similaritySchema.safeParse(fixture).success).toBe(true);
  });
  it('accepts local results after Gemini results in requested order', () => {
    const fixture = localSimilarityFixture();
    expect(similaritySchema.parse(fixture)).toEqual(fixture);
  });
  it.each([
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'gemini-embeddings' ? { ...r, score: -1.01 } : r) })) }),
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'local-embeddings' ? { ...r, score: 1.01 } : r) })) }),
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'local-embeddings' ? { ...r, model: '' } : r) })) }),
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'local-embeddings' ? { ...r, modelConfigurationId: 'local-v1' } : r) })) }),
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'gemini-embeddings' ? { ...r, cosineMilliseconds: 0.5 } : r) })) }),
    (f: ReturnType<typeof localSimilarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => r.method === 'jaccard' ? { ...r, computeMilliseconds: 0.5 } : r) })) }),
  ])('rejects incompatible embedding or timing data %#', (change) => {
    expect(similaritySchema.safeParse(change(localSimilarityFixture())).success).toBe(false);
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
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, embeddingRuns: [] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, preprocessing: { version: 'tokens-v1' } }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, paperIds: ['paper-1', 'paper-1'] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, pairs: [] }),
    (f: ReturnType<typeof similarityFixture>) => ({ ...f, pairs: f.pairs.map((p) => ({ ...p, results: p.results.map((r) => ({ ...r, score: 1.1 })) })) }),
  ])('rejects incompatible data %#', (change) => {
    expect(similaritySchema.safeParse(change(similarityFixture())).success).toBe(false);
  });
});
