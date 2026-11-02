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
const count = z.number().int().min(0);
const kmpStep = z.strictObject({
  index: count,
  character: z.string(),
  matchedBefore: count,
  fallbacks: z.array(count),
  matchedAfter: count,
  match: z.boolean(),
});
const lastOccurrence = z.strictObject({ character: z.string(), index: count });
const boyerMooreStep = z.strictObject({
  start: count,
  match: z.boolean(),
  mismatchIndex: z.number().int().min(-1),
  textCharacter: z.string(),
  lastIndex: z.number().int().min(-1),
  shift: z.number().int().min(1),
});
const rabinKarpWindow = z.strictObject({
  start: count,
  text: z.string(),
  hash: count,
  equalHash: z.boolean(),
  match: z.boolean(),
});
export const searchStepsSchema = z.strictObject({
  pattern: z.string().min(1),
  paperId: z.string().min(1),
  fragmentStart: count,
  fragment: z.string(),
  positions: z.array(count),
  kmp: z.strictObject({ failure: z.array(count), steps: z.array(kmpStep) }),
  boyerMoore: z.strictObject({ lastOccurrences: z.array(lastOccurrence), steps: z.array(boyerMooreStep) }),
  rabinKarp: z.strictObject({
    base: z.literal(256),
    modulus: z.literal(1000000007),
    patternHash: count,
    high: count,
    windows: z.array(rabinKarpWindow),
  }),
});
export const apiErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'PAPER_NOT_FOUND', 'CORPUS_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: z.string().min(1),
});
export type SearchMethod = (typeof searchMethods)[number];
export type SearchRequest = { pattern: string; methods: readonly SearchMethod[] };
export type SearchResponse = z.infer<typeof searchSchema>;
export type SearchStepsRequest = { pattern: string; paperId: string };
export type SearchSteps = z.infer<typeof searchStepsSchema>;
export type SearchResult = SearchResponse['results'][number];
