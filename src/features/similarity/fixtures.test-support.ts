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
export function stepsFixture() {
  const idf = Math.log(10);
  return {
    leftId: 'paper-1', rightId: 'paper-2',
    levenshtein: { leftPrefix: 'a b', rightPrefix: 'ab', cells: [[0, 1, 2], [1, 0, 1], [2, 1, 1], [3, 2, 1]], distance: 7, leftLength: 12, rightLength: 10, score: 1 - 7 / 12 },
    lcs: { leftTokens: ['ai', 'ml'], rightTokens: ['ml', 'ai'], cells: [[0, 0, 0], [0, 0, 1], [0, 1, 1]], length: 4, leftTokenCount: 9, rightTokenCount: 7, score: 0.5 },
    tfIdf: {
      terms: [
        { term: 'identifying', leftCount: 1, rightCount: 2, documentFrequency: 2, idf, leftWeight: idf / 4, rightWeight: idf / 2, product: idf * idf / 8 },
        { term: 'content', leftCount: 2, rightCount: 1, documentFrequency: 5, idf: Math.log(4), leftWeight: 0.0128767, rightWeight: 0.00948, product: 0.00012207255 },
      ],
      dotProduct: 0.0009636616, leftNorm: 0.136847, rightNorm: 0.128832, cosine: 0.25, angleDegrees: 75.5224878,
    },
  };
}
export function matrixFixture() {
  const f = similarityFixture();
  const r = f.pairs[0]!.results;
  const pair = (left: string, right: string, scores: number[]) => ({ left, right, results: r.map((x, i) => ({ ...x, score: scores[i]! })) });
  return {
    ...f, paperIds: ['paper-1', 'paper-2', 'paper-3'],
    pairs: [pair('paper-1', 'paper-2', [0.5, 0.6, 0.7, 0.8]), pair('paper-1', 'paper-3', [0.1, 0.2, 0.3, 0.4]), pair('paper-2', 'paper-3', [0.15, 0.25, 0.35, 0.45])],
  };
}
