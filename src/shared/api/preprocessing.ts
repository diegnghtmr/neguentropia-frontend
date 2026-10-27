import { z } from 'zod';

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
