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
export function localSimilarityFixture() {
  const gemini = geminiSimilarityFixture();
  return {
    ...gemini,
    methods: [...gemini.methods, 'local-embeddings'],
    pairs: gemini.pairs.map((pair) => ({ ...pair, results: [...pair.results, {
      method: 'local-embeddings', representation: 'embedding', metric: 'cosine', score: 0.812345,
      modelConfigurationId: 'local-v1', dimension: 384, cosineMilliseconds: 0.03125,
    }] })),
    embeddingRuns: [...gemini.embeddingRuns, {
      method: 'local-embeddings',
      configuration: {
        id: 'local-v1', modelId: 'intfloat/multilingual-e5-small', revision: '614241f622f53c4eeff9890bdc4f31cfecc418b3', dimension: 384,
        task: 'query', templateVersion: 'v1', normalization: 'l2', inputLengthVerification: 'verified',
      },
      papers: gemini.paperIds.map((paperId, i) => ({ paperId, inputTokenCount: 100 + i })),
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
