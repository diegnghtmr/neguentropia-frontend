import type { TreeMerge } from './schemas';

export function leafOrder(merges: readonly TreeMerge[]) {
  const byId = new Map(merges.map((merge) => [merge.id, merge]));
  const order: number[] = [];
  function walk(id: number) {
    const merge = byId.get(id);
    if (merge === undefined) {
      order.push(id);
      return;
    }
    walk(merge.leftId);
    walk(merge.rightId);
  }
  walk(merges[merges.length - 1]!.id);
  return order;
}

export function layoutTree(merges: readonly TreeMerge[]) {
  const order = leafOrder(merges);
  const positions = new Map(order.map((id, index) => [id, index]));
  for (const merge of merges) {
    positions.set(merge.id, (positions.get(merge.leftId)! + positions.get(merge.rightId)!) / 2);
  }
  return { order, positions };
}
