import { z } from 'zod';
import { preprocessingSchema } from '@/shared/api/preprocessing';

export const classicalMethods = ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard'] as const;
export const similarityMethods = [...classicalMethods, 'gemini-embeddings', 'local-embeddings'] as const;
const method = z.enum(similarityMethods);
const paperId = z.string().min(1);
const count = z.number().int().nonnegative();
const score = z.number().min(0).max(1);
const computeMilliseconds = z.number().nonnegative();
const modelConfiguration = z.strictObject({
  id: z.string().min(1), modelId: z.string().min(1), revision: z.string().min(1).nullable(),
  dimension: z.number().int().positive(), task: z.string().min(1), templateVersion: z.string().min(1),
  normalization: z.string().min(1), inputLengthVerification: z.literal('verified'),
});
const geminiVectorAcquisition = z.strictObject({ paperId, inputTokenCount: z.number().int().positive() });
const geminiRun = z.strictObject({
  method: z.literal('gemini-embeddings'), configuration: modelConfiguration,
  papers: z.array(geminiVectorAcquisition).min(2).max(20),
});
const result = z.discriminatedUnion('method', [
  z.strictObject({ method: z.literal('levenshtein'), representation: z.literal('joined-token-code-points'), score,
    distance: count, leftCodePointLength: count, rightCodePointLength: count, computeMilliseconds }),
  z.strictObject({ method: z.literal('lcs'), representation: z.literal('tokens'), score,
    length: count, subsequence: z.array(z.string().min(1)), leftTokenCount: count, rightTokenCount: count, computeMilliseconds }),
  z.strictObject({ method: z.literal('tf-idf-cosine'), representation: z.literal('global-tf-idf'), score,
    dimension: z.number().int().positive(), fitPaperCount: z.literal(20), computeMilliseconds }),
  z.strictObject({ method: z.literal('jaccard'), representation: z.literal('token-sets'), score,
    intersectionSize: count, unionSize: count, computeMilliseconds }),
  z.strictObject({ method: z.literal('gemini-embeddings'), representation: z.literal('embedding'), metric: z.literal('cosine'),
    score: z.number().min(-1).max(1), modelConfigurationId: z.string().min(1),
    dimension: z.number().int().positive(), cosineMilliseconds: computeMilliseconds }),
]);
const paperIds = z.array(paperId).min(2).max(20).refine((ids) => new Set(ids).size === ids.length, 'Duplicate paper IDs');
const methods = z.array(method).min(1).max(6).refine((items) => new Set(items).size === items.length, 'Duplicate methods');
export const similaritySchema = z.strictObject({
  preprocessing: preprocessingSchema, paperIds, methods,
  pairs: z.array(z.strictObject({ left: paperId, right: paperId, results: z.array(result).min(1).max(6) })).min(1).max(190),
  embeddingRuns: z.array(geminiRun).max(1),
});
export const apiErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'TEXT_TOO_LONG', 'PAPER_NOT_FOUND', 'CORPUS_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'MODEL_CONFIGURATION_UNVERIFIED', 'INVALID_PROVIDER_RESPONSE', 'INVALID_VECTOR', 'PROVIDER_TIMEOUT', 'INTERNAL_ERROR']),
  message: z.string().min(1),
  reason: z.enum(['ZERO_VECTOR', 'INVALID_RESPONSE', 'INVALID_MODEL_OUTPUT', 'TOKEN_COUNT_UNVERIFIED', 'LENGTH_LIMIT_EXCEEDED', 'PERMISSION_UNVERIFIED', 'COST_PROTECTION_UNVERIFIED', 'NUMERIC_OUT_OF_RANGE']).optional(),
  paperIds: z.array(paperId).min(1).max(20).refine((ids) => new Set(ids).size === ids.length).optional(),
});
export type SimilarityRequest = { paperIds: string[]; methods: SimilarityMethod[] };
export type SimilarityResponse = z.infer<typeof similaritySchema>;
export type SimilarityResult = z.infer<typeof result>;
export type SimilarityMethod = z.infer<typeof method>;
