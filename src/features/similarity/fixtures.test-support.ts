export function geminiSimilarityFixture() {
  const classical = similarityFixture();
  return {
    ...classical,
    methods: [...classical.methods, 'gemini-embeddings'],
    pairs: classical.pairs.map((pair) => ({ ...pair, results: [...pair.results, {
      method: 'gemini-embeddings', representation: 'embedding', metric: 'cosine', score: -0.123456,
      modelConfigurationId: 'gemini-v1', dimension: 3072, cosineMilliseconds: 0.0625,
    }] })),
    embeddingRuns: [{
      method: 'gemini-embeddings',
      configuration: {
        id: 'gemini-v1', modelId: 'gemini-embedding-2', revision: null, dimension: 3072,
        task: 'sentence similarity', templateVersion: 'v1', normalization: 'none', inputLengthVerification: 'verified',
      },
      papers: classical.paperIds.map((paperId) => ({ paperId, inputTokenCount: 42 })),
    }],
  };
}
export function catalogFixture() {
  return { corpusState: 'ready', papers: Array.from({ length: 20 }, (_, i) => ({
    id: `paper-${i + 1}`, title: `Paper ${i + 1}`, authors: ['Author'],
  })) };
}
export function similarityFixture() {
  return {
    preprocessing: {
      version: 'tokens-v1', unicodeNormalization: 'NFC', caseRule: 'Locale.ROOT-lowercase',
      tokenRule: 'unicode-letter-mark-digit-runs-with-letter', stopwordsRemoved: false,
      stemmingApplied: false, documentOrder: 'manifest', termTieBreak: 'first-occurrence',
    },
    paperIds: ['paper-1', 'paper-2'], methods: ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard'],
    pairs: [{ left: 'paper-1', right: 'paper-2', results: [
      { method: 'levenshtein', representation: 'joined-token-code-points', score: 0.5, distance: 1, leftCodePointLength: 2, rightCodePointLength: 2, computeMilliseconds: 0.125 },
      { method: 'lcs', representation: 'tokens', score: 2 / 3, length: 2, subsequence: ['ai', 'ai'], leftTokenCount: 3, rightTokenCount: 3, computeMilliseconds: 0.25 },
      { method: 'tf-idf-cosine', representation: 'global-tf-idf', score: 0.6694188517266484, dimension: 4, fitPaperCount: 20, computeMilliseconds: 0.375 },
      { method: 'jaccard', representation: 'token-sets', score: 1 / 3, intersectionSize: 1, unionSize: 3, computeMilliseconds: 0.5 },
    ] }], embeddingRuns: [],
  };
}
