import { layoutTree } from './tree';
import type { TreeMerge } from './schemas';

type Props = { name: string; merges: readonly TreeMerge[]; leafLabels: readonly string[]; leafTitles: readonly string[] };

const rowHeight = 20;
const top = 10;
const labelWidth = 150;
const plotWidth = 420;
const right = 20;
const axisHeight = 40;
const tickCount = 4;

export function Dendrogram({ name, merges, leafLabels, leafTitles }: Props) {
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
  const label = `${name} dendrogram of ${layout.order.length} papers and ${merges.length} merges, merge heights from 0 to ${domain.toFixed(4)}`;
  return <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMinYMin meet">
    {layout.order.map((id, index) => <text key={id} data-leaf={id} x={labelWidth - 6} y={y(index)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor">
      <title>{leafTitles[id]}</title>{leafLabels[id]}
    </text>)}
    {merges.map((merge) => {
      const at = x(merge.height);
      return <g key={merge.id} data-merge={merge.id} fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1={at} x2={at} y1={y(positionOf(merge.leftId))} y2={y(positionOf(merge.rightId))} />
        <line x1={x(heightOf(merge.leftId))} x2={at} y1={y(positionOf(merge.leftId))} y2={y(positionOf(merge.leftId))} />
        <line x1={x(heightOf(merge.rightId))} x2={at} y1={y(positionOf(merge.rightId))} y2={y(positionOf(merge.rightId))} />
      </g>;
    })}
    <g aria-hidden="true" stroke="currentColor" strokeWidth="1" fontSize="10">
      <line x1={x(0)} x2={x(domain)} y1={top + plotHeight + 4} y2={top + plotHeight + 4} />
      {ticks.map((tick) => <g key={tick}>
        <line x1={x(tick)} x2={x(tick)} y1={top + plotHeight + 4} y2={top + plotHeight + 9} />
        <text x={x(tick)} y={top + plotHeight + 21} textAnchor="middle" fill="currentColor" stroke="none">{tick.toFixed(2)}</text>
      </g>)}
      <text x={x(domain / 2)} y={top + plotHeight + 36} textAnchor="middle" fill="currentColor" stroke="none">Distance (1 minus TF-IDF cosine)</text>
    </g>
  </svg>;
}
