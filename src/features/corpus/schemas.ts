import { z } from 'zod';

// Validate UTF-16 without normalizing or repairing the server's original text.
const text = z.string().min(1).refine((value) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value), 'Invalid Unicode');
const summaryShape = { id: text, title: text, authors: z.array(text).min(1) };
export const catalogSchema = z.strictObject({
  corpusState: z.literal('ready'),
  papers: z.array(z.strictObject(summaryShape)).length(20).refine(
    (papers) => new Set(papers.map((paper) => paper.id)).size === papers.length, 'Duplicate paper IDs',
  ),
});
export const detailSchema = z.strictObject({
  ...summaryShape,
  originalAbstract: text,
});
export type PaperCatalog = z.infer<typeof catalogSchema>;
export type PaperDetail = z.infer<typeof detailSchema>;
