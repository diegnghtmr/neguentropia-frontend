const leafCount = 20;
const pairs = [[20, 21], [22, 23], [24, 25], [26, 27], [28, 29]] as const;

export function catalogFixture() {
  return { corpusState: 'ready', papers: Array.from({ length: leafCount }, (_, i) => ({
    id: `paper-${i + 1}`, title: `Paper ${i + 1}`, authors: ['Author'],
  })) };
}

function merges(scale: number) {
  const children: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    children.push([2 * i, 2 * i + 1]);
  }
  for (const pair of pairs) {
    children.push([pair[0], pair[1]]);
  }
  children.push([30, 31], [32, 33], [35, 36], [37, 34]);
  const sizes = new Map<number, number>();
  for (let i = 0; i < leafCount; i += 1) {
    sizes.set(i, 1);
  }
  return children.map(([leftId, rightId], index) => {
    const id = leafCount + index;
    const size = sizes.get(leftId)! + sizes.get(rightId)!;
    sizes.set(id, size);
    return { id, leftId, rightId, height: Math.round((0.05 + 0.04 * index) * scale * 10000) / 10000, size };
  });
}

export function clusteringFixture() {
  return {
    leaves: Array.from({ length: leafCount }, (_, i) => ({ id: i, paperId: `paper-${i + 1}` })),
    results: [
      { method: 'single-linkage', merges: merges(0.5), silhouette: 0.1234, partition: partitionFixture() },
      { method: 'complete-linkage', merges: merges(1), silhouette: 0.4321, partition: partitionFixture() },
      { method: 'average-linkage', merges: merges(0.75), silhouette: 0.2222, partition: partitionFixture() },
    ],
  };
}

export function partitionFixture() {
  return [
    { paperIds: Array.from({ length: 16 }, (_, i) => `paper-${i + 1}`) },
    { paperIds: Array.from({ length: 4 }, (_, i) => `paper-${i + 17}`) },
  ];
}
