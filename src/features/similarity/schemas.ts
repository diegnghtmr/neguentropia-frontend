import { z } from 'zod';

export const classicalMethods = ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard'] as const;
export const similarityMethods = [...classicalMethods, 'gemini-embeddings', 'local-embeddings'] as const;
const method = z.enum(similarityMethods);
const paperId = z.string().min(1);
const count = z.number().int().nonnegative();
const score = z.number().min(0).max(1);
const result = z.discriminatedUnion('method', [
  z.strictObject({ method: z.literal('levenshtein'), representation: z.literal('joined-tokens'), score,
    distance: count, leftLength: count, rightLength: count }),
  z.strictObject({ method: z.literal('lcs'), representation: z.literal('tokens'), score,
    length: count, subsequence: z.array(z.string().min(1)), leftTokenCount: count, rightTokenCount: count }),
  z.strictObject({ method: z.literal('tf-idf-cosine'), representation: z.literal('global-tf-idf'), score,
    dimension: z.number().int().positive(), fitPaperCount: z.literal(20) }),
  z.strictObject({ method: z.literal('jaccard'), representation: z.literal('token-sets'), score,
    intersectionSize: count, unionSize: count }),
  z.strictObject({ method: z.literal('gemini-embeddings'), representation: z.literal('embedding'), metric: z.literal('cosine'),
    score: z.number().min(-1).max(1), model: z.string().min(1),
    dimension: z.number().int().positive() }),
  z.strictObject({ method: z.literal('local-embeddings'), representation: z.literal('embedding'), metric: z.literal('cosine'),
    score: z.number().min(-1).max(1), model: z.string().min(1),
    dimension: z.number().int().positive() }),
]);
const paperIds = z.array(paperId).min(2).max(20).refine((ids) => new Set(ids).size === ids.length, 'Duplicate paper IDs');
const methods = z.array(method).min(1).max(6).refine((items) => new Set(items).size === items.length, 'Duplicate methods');
export const similaritySchema = z.strictObject({
  paperIds, methods,
  pairs: z.array(z.strictObject({ left: paperId, right: paperId, results: z.array(result).min(1).max(6) })).min(1).max(190),
});
export const apiErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'PAPER_NOT_FOUND', 'CORPUS_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: z.string().min(1),
});
export type SimilarityRequest = { paperIds: string[]; methods: SimilarityMethod[] };
export type SimilarityResponse = z.infer<typeof similaritySchema>;
export type SimilarityResult = z.infer<typeof result>;
export type SimilarityMethod = z.infer<typeof method>;
