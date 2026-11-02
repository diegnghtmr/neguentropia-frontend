import type { SimilarityMethod } from './schemas';

export const methodLabels: Record<SimilarityMethod, string> = { levenshtein: 'Levenshtein', lcs: 'LCS', 'tf-idf-cosine': 'Coseno TF-IDF', jaccard: 'Jaccard', 'gemini-embeddings': 'Embeddings de Gemini', 'local-embeddings': 'Embeddings locales' };
