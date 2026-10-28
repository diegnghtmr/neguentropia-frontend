import { z } from 'zod';

export const searchMethods = ['kmp', 'boyer-moore', 'rabin-karp'] as const;
const method = z.enum(searchMethods);
const paper = z.strictObject({
  paperId: z.string().min(1),
  positions: z.array(z.number().int().min(0)),
});
const result = z.strictObject({
  method,
  preprocessingMilliseconds: z.number().min(0),
  searchMilliseconds: z.number().min(0),
  papers: z.array(paper).length(20),
});
export const searchSchema = z.strictObject({
  pattern: z.string().min(1),
  results: z.array(result).min(1).max(3),
});
export const apiErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'CORPUS_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: z.string().min(1),
});
export type SearchMethod = (typeof searchMethods)[number];
export type SearchRequest = { pattern: string; methods: readonly SearchMethod[] };
export type SearchResponse = z.infer<typeof searchSchema>;
export type SearchResult = SearchResponse['results'][number];
