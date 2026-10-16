import { z } from 'zod';

// Validate UTF-16 without normalizing or repairing the server's original text.
const text = z.string().min(1).refine((value) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value), 'Invalid Unicode');
const summaryShape = { id: text, title: text, authors: z.array(text).min(1) };
const similarityMethod = z.enum([
  'levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard', 'gemini-embeddings', 'local-embeddings',
]);
const blockedReason = z.enum([
  'NOT_IMPLEMENTED', 'CORPUS_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'TOKEN_COUNT_UNVERIFIED',
  'LENGTH_LIMIT_EXCEEDED', 'PERMISSION_UNVERIFIED', 'COST_PROTECTION_UNVERIFIED', 'MODEL_CONFIGURATION_UNVERIFIED',
]);
export const availabilitySchema = z.discriminatedUnion('available', [
  z.strictObject({ available: z.literal(true), blockedReason: z.null() }),
  z.strictObject({ available: z.literal(false), blockedReason }),
]);
export const catalogSchema = z.strictObject({
  corpusVersion: text,
  corpusState: z.literal('ready'),
  papers: z.array(z.strictObject(summaryShape)).length(20).refine(
    (papers) => new Set(papers.map((paper) => paper.id)).size === papers.length, 'Duplicate paper IDs',
  ),
  capabilities: z.strictObject({
    ranking: availabilitySchema,
    clustering: availabilitySchema,
    search: availabilitySchema,
    similarity: z.array(z.strictObject({ method: similarityMethod, availability: availabilitySchema })).length(6).refine(
      (methods) => new Set(methods.map((entry) => entry.method)).size === methods.length, 'Duplicate similarity methods',
    ),
  }),
});
export const detailSchema = z.strictObject({
  corpusVersion: text,
  ...summaryShape,
  originalAbstract: text,
  abstractSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type PaperCatalog = z.infer<typeof catalogSchema>;
export type PaperDetail = z.infer<typeof detailSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
