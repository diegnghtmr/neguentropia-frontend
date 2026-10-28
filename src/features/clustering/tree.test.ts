import { describe, expect, it } from 'vitest';
import { layoutTree, leafOrder } from './tree';
import { clusteringFixture } from './fixtures.test-support';

const small = [
  { id: 4, leftId: 0, rightId: 1, height: 0.2, size: 2 },
  { id: 5, leftId: 3, rightId: 2, height: 0.5, size: 2 },
  { id: 6, leftId: 5, rightId: 4, height: 0.9, size: 4 },
];

describe('dendrogram tree helpers', () => {
  it('walks from the root visiting the left child first', () => {
    expect(leafOrder(small)).toEqual([3, 2, 0, 1]);
  });
  it('orders the 20 leaves of a full tree', () => {
    const order = leafOrder(clusteringFixture().results[0]!.merges);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(order).toHaveLength(20);
  });
  it('places each merge at the midpoint of its children', () => {
    const { positions } = layoutTree(small);
    expect(positions.get(3)).toBe(0);
    expect(positions.get(1)).toBe(3);
    expect(positions.get(5)).toBe(0.5);
    expect(positions.get(4)).toBe(2.5);
    expect(positions.get(6)).toBe(1.5);
  });
});
