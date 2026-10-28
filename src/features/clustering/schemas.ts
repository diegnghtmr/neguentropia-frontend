import { z } from 'zod';

export const clusteringMethods = ['single-linkage', 'complete-linkage', 'average-linkage'] as const;
const paperId = z.string().min(1);
const leaf = z.strictObject({ id: z.number().int().min(0).max(19), paperId });
const merge = z.strictObject({
  id: z.number().int().min(20).max(38),
  leftId: z.number().int().min(0).max(37),
  rightId: z.number().int().min(0).max(37),
  height: z.number().min(0).max(1),
  size: z.number().int().min(2).max(20),
});
const cluster = z.strictObject({
  paperIds: z.array(paperId).min(1).max(19),
});
const result = z.strictObject({
  method: z.enum(clusteringMethods),
  merges: z.array(merge).length(19),
  partition: z.array(cluster).min(2).max(19),
  silhouette: z.number().min(-1).max(1),
});
export const clusteringSchema = z.strictObject({
  leaves: z.array(leaf).length(20),
  results: z.tuple([
    result.extend({ method: z.literal('single-linkage') }),
    result.extend({ method: z.literal('complete-linkage') }),
    result.extend({ method: z.literal('average-linkage') }),
  ]),
});
export const apiErrorSchema = z.strictObject({
  code: z.enum(['INVALID_INPUT', 'CORPUS_UNAVAILABLE', 'INTERNAL_ERROR']),
  message: z.string().min(1),
});
export type ClusteringRequest = { clusterCount: number };
export type ClusteringResponse = z.infer<typeof clusteringSchema>;
export type ClusteringResult = ClusteringResponse['results'][number];
export type ClusteringMethod = (typeof clusteringMethods)[number];
export type TreeMerge = z.infer<typeof merge>;
