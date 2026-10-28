import { Fragment } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { groupColor, pillInk } from './groupColors';
import type { TreeMerge } from './schemas';

type Props = { name: string; merges: readonly TreeMerge[]; leafLabels: readonly string[]; leafGroups: readonly number[]; clusterCount: number };

export function MergeTable({ name, merges, leafLabels, leafGroups, clusterCount }: Props) {
  const stepOffset = leafLabels.length - 1;
  const applied = merges.length + 1 - clusterCount;
  const sizes = new Map(merges.map((merge) => [merge.id, merge.size]));
  const groups = new Map<number, number | null>(leafGroups.map((group, id) => [id, group]));
  for (const merge of merges) {
    const left = groups.get(merge.leftId) ?? null;
    const right = groups.get(merge.rightId) ?? null;
    if (left === right) {
      groups.set(merge.id, left);
    } else {
      groups.set(merge.id, null);
    }
  }
  function pill(id: number) {
    const group = groups.get(id) ?? null;
    if (id < leafLabels.length) {
      return <span className="paper-id" style={{ backgroundColor: groupColor(group!), color: pillInk(group!) }}>{leafLabels[id]}</span>;
    }
    const text = `paso ${id - stepOffset} (${sizes.get(id)} artículos)`;
    if (group === null) {
      return <span className="paper-id merge-pill-neutral" data-pill-neutral>{text}</span>;
    }
    return <span className="paper-id" style={{ backgroundColor: groupColor(group), color: pillInk(group) }}>{text}</span>;
  }
  return <TableContainer>
    <Table aria-label={`Pasos de fusión de ${name}`} className="merge-table">
      <TableHeader>
        <TableRow>
          <TableHead>Paso</TableHead>
          <TableHead>Une</TableHead>
          <TableHead numeric>Distancia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {merges.map((merge, index) => {
          const muted = index >= applied;
          return <Fragment key={merge.id}>
            {index === applied && <TableRow data-cut-row>
              <TableCell colSpan={3} className="merge-cut">{`Corte: ${clusterCount} grupos`}</TableCell>
            </TableRow>}
            <TableRow data-merge-row data-muted={muted ? 'true' : undefined} className={muted ? 'merge-muted' : undefined}>
              <TableCell className="merge-cell">{merge.id - stepOffset}</TableCell>
              <TableCell className="merge-cell">{pill(merge.leftId)}<span className="merge-plus"> + </span>{pill(merge.rightId)}</TableCell>
              <TableCell numeric className="merge-cell">{merge.height.toFixed(4)}</TableCell>
            </TableRow>
          </Fragment>;
        })}
      </TableBody>
    </Table>
  </TableContainer>;
}
