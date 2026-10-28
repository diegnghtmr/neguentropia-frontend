import { layoutTree } from './tree';
import { groupColor, neutralStroke, pillInk } from './groupColors';
import type { TreeMerge } from './schemas';

type Props = { name: string; merges: readonly TreeMerge[]; leafLabels: readonly string[]; leafTitles: readonly string[]; clusterCount?: number; leafGroups?: readonly number[] };

const rowHeight = 22;
const top = 18;
const labelWidth = 84;
const plotWidth = 300;
const right = 20;
const pillHeight = 18;
const charWidth = 7.2;
const axisHeight = 40;
const tickCount = 4;

export function Dendrogram({ name, merges, leafLabels, leafTitles, clusterCount, leafGroups }: Props) {
  const layout = layoutTree(merges);
  const domain = merges[merges.length - 1]!.height;
  const width = labelWidth + plotWidth + right;
  const plotHeight = layout.order.length * rowHeight;
  const height = top + plotHeight + axisHeight;
  const x = (value: number) => labelWidth + (value / domain) * plotWidth;
  const y = (position: number) => top + position * rowHeight + rowHeight / 2;
  const heights = new Map(merges.map((merge) => [merge.id, merge.height]));
  const heightOf = (id: number) => heights.get(id) ?? 0;
  const positionOf = (id: number) => layout.positions.get(id)!;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (domain * i) / tickCount);
  const nodeGroups = new Map<number, number | null>();
  if (leafGroups !== undefined) {
    layout.order.forEach((id) => nodeGroups.set(id, leafGroups[id] ?? null));
    for (const merge of merges) {
      const left = nodeGroups.get(merge.leftId) ?? null;
      const right = nodeGroups.get(merge.rightId) ?? null;
      if (left === right) {
        nodeGroups.set(merge.id, left);
      } else {
        nodeGroups.set(merge.id, null);
      }
    }
  }
  const isLeaf = (id: number) => !heights.has(id);
  const branch = (id: number) => {
    const group = nodeGroups.get(id);
    if (group === undefined || group === null) {
      return { stroke: neutralStroke, width: 1 };
    }
    return { stroke: groupColor(group), width: 2.5 };
  };
  const lastApplied = clusterCount === undefined ? undefined : merges[merges.length - clusterCount];
  const nextMerge = clusterCount === undefined ? undefined : merges[merges.length - clusterCount + 1];
  const cutAt = lastApplied && nextMerge ? x((lastApplied.height + nextMerge.height) / 2) : undefined;
  const label = `Dendrograma de ${name} con ${layout.order.length} artículos y ${merges.length} fusiones, alturas de fusión de 0 a ${domain.toFixed(4)}`;
  return <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width * 1.6 }} preserveAspectRatio="xMinYMin meet">
    {layout.order.map((id, index) => {
      const group = leafGroups?.[id];
      const pillWidth = leafLabels[id]!.length * charWidth + 10;
      return <g key={id}>
        {group !== undefined && <rect data-leaf-pill={id} x={labelWidth - 6 - pillWidth + 5} y={y(index) - pillHeight / 2} width={pillWidth} height={pillHeight} rx={pillHeight / 2} fill={groupColor(group)} />}
        <text data-leaf={id} x={labelWidth - 6} y={y(index)} textAnchor="end" dominantBaseline="middle" fontSize="13" fill={group === undefined ? 'currentColor' : pillInk(group)}>
          <title>{leafTitles[id]}</title>{leafLabels[id]}
        </text>
      </g>;
    })}
    {merges.map((merge) => {
      const at = x(merge.height);
      const own = branch(merge.id);
      const stubs = [merge.leftId, merge.rightId].map((childId) => ({ childId, ...(isLeaf(childId) ? branch(childId) : own) }));
      return <g key={merge.id} data-merge={merge.id} fill="none" stroke={leafGroups === undefined ? 'currentColor' : own.stroke} strokeWidth={leafGroups === undefined ? 1.5 : own.width}>
        <line x1={at} x2={at} y1={y(positionOf(merge.leftId))} y2={y(positionOf(merge.rightId))} />
        {stubs.map((stub) => <line key={stub.childId} data-stub={stub.childId} stroke={leafGroups === undefined ? undefined : stub.stroke} strokeWidth={leafGroups === undefined ? undefined : stub.width} x1={x(heightOf(stub.childId))} x2={at} y1={y(positionOf(stub.childId))} y2={y(positionOf(stub.childId))} />)}
      </g>;
    })}
    {cutAt !== undefined && <g data-cut aria-hidden="true" stroke="currentColor" fontSize="12">
      <line x1={cutAt} x2={cutAt} y1={top - 2} y2={top + plotHeight} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={cutAt} y={top - 6} textAnchor="middle" fill="currentColor" stroke="none">corte</text>
    </g>}
    <g aria-hidden="true" stroke="currentColor" strokeWidth="1" fontSize="12">
      <line x1={x(0)} x2={x(domain)} y1={top + plotHeight + 4} y2={top + plotHeight + 4} />
      {ticks.map((tick) => <g key={tick}>
        <line x1={x(tick)} x2={x(tick)} y1={top + plotHeight + 4} y2={top + plotHeight + 9} />
        <text x={x(tick)} y={top + plotHeight + 21} textAnchor="middle" fill="currentColor" stroke="none">{tick.toFixed(2)}</text>
      </g>)}
      <text x={x(domain / 2)} y={top + plotHeight + 36} textAnchor="middle" fill="currentColor" stroke="none">Distancia (1 menos coseno TF-IDF)</text>
    </g>
  </svg>;
}
