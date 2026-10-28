import { describe, expect, it } from 'vitest';
import { clusteringSchema } from './schemas';
import { clusteringFixture } from './fixtures.test-support';

describe('clustering response boundary', () => {
  it('accepts a complete response with 20 leaves, 19 merges and three results', () => {
    const fixture = clusteringFixture();
    expect(fixture.leaves).toHaveLength(20);
    expect(fixture.results.map((result) => result.merges.length)).toEqual([19, 19, 19]);
    expect(clusteringSchema.parse(fixture)).toEqual(fixture);
  });
  it.each([
    ['top level', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, extra: 1 })],
    ['leaf', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, leaves: f.leaves.map((l, i) => i === 0 ? { ...l, label: 'x' } : l) })],
    ['result', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.map((r, i) => i === 0 ? { ...r, ms: 1 } : r) })],
    ['merge', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.map((r, i) => i === 0 ? { ...r, merges: r.merges.map((m, j) => j === 0 ? { ...m, extra: 1 } : m) } : r) })],
    ['cluster', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.map((r, i) => i === 0 ? { ...r, partition: r.partition.map((c, j) => j === 0 ? { ...c, extra: 1 } : c) } : r) })],
  ])('rejects extra fields in the %s', (_name, change) => {
    expect(clusteringSchema.safeParse(change(clusteringFixture())).success).toBe(false);
  });
  it.each([
    ['wrong method order', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: [f.results[1], f.results[0], f.results[2]] })],
    ['two results', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.slice(0, 2) })],
    ['silhouette above one', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.map((r, i) => i === 0 ? { ...r, silhouette: 1.1 } : r) })],
    ['height above one', (f: ReturnType<typeof clusteringFixture>) => ({ ...f, results: f.results.map((r, i) => i === 0 ? { ...r, merges: r.merges.map((m, j) => j === 18 ? { ...m, height: 1.5 } : m) } : r) })],
  ])('rejects %s', (_name, change) => {
    expect(clusteringSchema.safeParse(change(clusteringFixture())).success).toBe(false);
  });
});
