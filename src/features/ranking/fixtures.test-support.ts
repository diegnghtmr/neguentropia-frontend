export function rankingFixture() {
  const topTerms = [{ term: 'zeta', frequency: 9 }, { term: 'alpha', frequency: 9 }, { term: 'Ωμέγα', frequency: 2 }];
  return {
    corpusVersion: 'synthetic-ranking-v1',
    preprocessing: {
      version: 'tokens-v1', unicodeNormalization: 'NFC', caseRule: 'Locale.ROOT-lowercase',
      tokenRule: 'unicode-letter-mark-digit-runs-with-letter', stopwordsRemoved: false,
      stemmingApplied: false, documentOrder: 'manifest', termTieBreak: 'first-occurrence',
    },
    scope: 'all-20-abstracts', paperCount: 20, totalTokenCount: 20, distinctTermCount: 3, maxFrequency: 9,
    parameters: { radixBase: 10, bucketStrategy: 'interval-counting', bucketCount: 1, bucketWidth: 10 },
    results: ['counting-sort', 'radix-sort', 'bucket-sort'].map((method, index) => ({
      method, topTerms: topTerms.map((entry) => ({ ...entry })), sortMilliseconds: [0.125, 0.25, 0.375][index]!,
    })),
  };
}
