import { z } from 'zod';

const count = z.number().int().nonnegative();
export const preprocessingSchema = z.strictObject({
  version: z.string().min(1),
  unicodeNormalization: z.literal('NFC'),
  caseRule: z.literal('Locale.ROOT-lowercase'),
  tokenRule: z.literal('unicode-letter-mark-digit-runs-with-letter'),
  stopwordsRemoved: z.literal(false),
  stemmingApplied: z.literal(false),
  documentOrder: z.literal('manifest'),
  termTieBreak: z.literal('first-occurrence'),
});
export const termFrequencySchema = z.strictObject({ term: z.string().min(1), frequency: z.number().int().positive() });
export const rankingResultSchema = z.strictObject({
  method: z.enum(['counting-sort', 'radix-sort', 'bucket-sort']),
  topTerms: z.array(termFrequencySchema).max(15),
  sortMilliseconds: z.number().nonnegative(),
});
export const rankingParametersSchema = z.strictObject({
  radixBase: z.literal(10), bucketStrategy: z.literal('interval-counting'),
  bucketCount: count, bucketWidth: count,
});
export const rankingSchema = z.strictObject({
  corpusVersion: z.string().min(1), preprocessing: preprocessingSchema,
  scope: z.literal('all-20-abstracts'), paperCount: z.literal(20),
  totalTokenCount: count, distinctTermCount: count, maxFrequency: count,
  parameters: rankingParametersSchema,
  results: z.tuple([
    rankingResultSchema.extend({ method: z.literal('counting-sort') }),
    rankingResultSchema.extend({ method: z.literal('radix-sort') }),
    rankingResultSchema.extend({ method: z.literal('bucket-sort') }),
  ]),
}).superRefine((data, ctx) => {
  const first = data.results[0].topTerms;
  const expectedLength = Math.min(15, data.distinctTermCount);
  if (data.results.some((result) => result.topTerms.length !== expectedLength || result.topTerms.some((entry, i) =>
    entry.term !== first[i]?.term || entry.frequency !== first[i]?.frequency))) {
    ctx.addIssue({ code: 'custom', path: ['results'], message: 'Expected identical complete top terms' });
  }
  if (new Set(first.map((entry) => entry.term)).size !== first.length ||
    first.some((entry, i) => i > 0 && entry.frequency > first[i - 1]!.frequency) ||
    (first[0]?.frequency ?? 0) !== data.maxFrequency ||
    data.totalTokenCount < data.maxFrequency || data.totalTokenCount < data.distinctTermCount) {
    ctx.addIssue({ code: 'custom', path: ['results'], message: 'Inconsistent ranking statistics or order' });
  }
});
export type RankingResponse = z.infer<typeof rankingSchema>;
