export function geminiSimilarityFixture() {
  const classical = similarityFixture();
  return {
    ...classical,
    methods: [...classical.methods, 'gemini-embeddings'],
    pairs: classical.pairs.map((pair) => ({ ...pair, results: [...pair.results, {
      method: 'gemini-embeddings', representation: 'embedding', metric: 'cosine', score: -0.123456,
      model: 'gemini-embedding-2', dimension: 3072,
    }] })),
  };
}
export function localSimilarityFixture() {
  const gemini = geminiSimilarityFixture();
  return {
    ...gemini,
    methods: [...gemini.methods, 'local-embeddings'],
    pairs: gemini.pairs.map((pair) => ({ ...pair, results: [...pair.results, {
      method: 'local-embeddings', representation: 'embedding', metric: 'cosine', score: 0.812345,
      model: 'intfloat/multilingual-e5-small', dimension: 384,
    }] })),
  };
}
export function catalogFixture() {
  return { corpusState: 'ready', papers: Array.from({ length: 20 }, (_, i) => ({
    id: `paper-${i + 1}`, title: `Paper ${i + 1}`, authors: ['Author'],
  })) };
}
export function similarityFixture() {
  return {
    paperIds: ['paper-1', 'paper-2'], methods: ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard'],
    pairs: [{ left: 'paper-1', right: 'paper-2', results: [
      { method: 'levenshtein', representation: 'joined-tokens', score: 0.5, distance: 1, leftLength: 2, rightLength: 2 },
      { method: 'lcs', representation: 'tokens', score: 2 / 3, length: 2, subsequence: ['ai', 'ai'], leftTokenCount: 3, rightTokenCount: 3 },
      { method: 'tf-idf-cosine', representation: 'global-tf-idf', score: 0.6694188517266484, dimension: 4, fitPaperCount: 20 },
      { method: 'jaccard', representation: 'token-sets', score: 1 / 3, intersectionSize: 1, unionSize: 3 },
    ] }],
  };
}
