import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { TableContainer, Table, TableCaption, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { groupColor } from './groupColors';
import type { ClusteringResult } from './schemas';

type Props = { results: readonly ClusteringResult[]; clusterCount: number };

const names = ['Single', 'Complete', 'Average'];
const width = 640;
const height = 320;
const left = 64;
const top = 28;
const right = 20;
const bottom = 56;
const yTickCount = 5;
const tieTolerance = 1e-12;
const firstCut = 2;
const lastCut = 19;

function Marker({ shape, x, y, color }: { shape: number; x: number; y: number; color: string }) {
  if (shape === 0) {
    return <circle data-point cx={x} cy={y} r="3.5" fill={color} />;
  }
  if (shape === 1) {
    return <rect data-point x={x - 3.5} y={y - 3.5} width="7" height="7" fill={color} />;
  }
  return <polygon data-point points={`${x},${y - 4.5} ${x + 4.5},${y} ${x},${y + 4.5} ${x - 4.5},${y}`} fill={color} />;
}

export function SilhouetteCuts({ results, clusterCount }: Props) {
  const values = results.map((result) => result.silhouettesByCut.map((cut) => cut.silhouette));
  const all = values.flat();
  const low = Math.min(0, ...all);
  const high = Math.max(0, ...all);
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (cut: number) => left + ((cut - firstCut) / (lastCut - firstCut)) * plotWidth;
  const y = (value: number) => top + ((high - value) / (high - low)) * plotHeight;
  const cuts = Array.from({ length: lastCut - firstCut + 1 }, (_, i) => firstCut + i);
  const yTicks = Array.from({ length: yTickCount }, (_, i) => low + ((high - low) * i) / (yTickCount - 1));
  const description = `Gráfica de líneas con k de ${firstCut} a ${lastCut} en el eje horizontal y la silueta de ${low.toFixed(3)} a ${high.toFixed(3)} en el eje vertical, una línea por criterio: Single, Complete y Average. El corte elegido es k = ${clusterCount}. Los mismos valores están en la tabla.`;
  return <Card className="ranking-result">
    <CardHeader><CardTitle>Silueta por corte</CardTitle></CardHeader>
    <CardContent>
      <div className="dendrogram-scroll">
        <svg role="graphics-document" aria-labelledby="silhouette-cuts-title silhouette-cuts-desc" viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width * 1.6, minWidth: 560 }} preserveAspectRatio="xMinYMin meet">
          <title id="silhouette-cuts-title">Silueta por corte, k = 2 a 19</title>
          <desc id="silhouette-cuts-desc">{description}</desc>
          <g aria-hidden="true" stroke="currentColor" fontSize="12">
            {yTicks.map((tick) => <g key={tick} data-y-tick>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} strokeOpacity="0.15" />
              <text x={left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fill="currentColor" stroke="none">{tick.toFixed(3)}</text>
            </g>)}
            <line x1={left} x2={left} y1={top} y2={top + plotHeight} />
            <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} />
            {cuts.map((cut) => <text key={cut} data-x-tick x={x(cut)} y={top + plotHeight + 18} textAnchor="middle" fill="currentColor" stroke="none">{cut}</text>)}
            <text x={left + plotWidth / 2} y={height - 10} textAnchor="middle" fill="currentColor" stroke="none">k (cantidad de grupos)</text>
            <text x="14" y={top + plotHeight / 2} textAnchor="middle" fill="currentColor" stroke="none" transform={`rotate(-90 14 ${top + plotHeight / 2})`}>Silueta</text>
          </g>
          <g data-cut={clusterCount} aria-hidden="true" stroke="currentColor" fontSize="12">
            <line x1={x(clusterCount)} x2={x(clusterCount)} y1={top - 4} y2={top + plotHeight} strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={x(clusterCount) + 6} y={top + 2} textAnchor="start" dominantBaseline="hanging" fill="currentColor" stroke="none">corte</text>
          </g>
          {values.map((line, index) => <g key={names[index]} aria-hidden="true">
            <polyline data-line={names[index]} fill="none" stroke={groupColor(index)} strokeWidth="2" points={line.map((value, i) => `${x(cuts[i]!)},${y(value)}`).join(' ')} />
            {line.map((value, i) => <Marker key={cuts[i]} shape={index} x={x(cuts[i]!)} y={y(value)} color={groupColor(index)} />)}
          </g>)}
        </svg>
      </div>
      <ul aria-label="Leyenda" className="silhouette-legend">
        {names.map((name, index) => <li key={name}>
          <svg aria-hidden="true" width="26" height="12" viewBox="0 0 26 12"><line x1="0" x2="26" y1="6" y2="6" stroke={groupColor(index)} strokeWidth="2" /><Marker shape={index} x={13} y={6} color={groupColor(index)} /></svg>
          {name}
        </li>)}
      </ul>
      <TableContainer>
        <Table aria-label="Silueta para todos los cortes">
          <TableCaption className="sr-only">Silueta para todos los cortes</TableCaption>
          <TableHeader><TableRow><TableHead numeric>k</TableHead>{names.map((name) => <TableHead key={name} numeric>{name}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{cuts.map((cut, i) => {
            const row = values.map((line) => line[i]!);
            const best = Math.max(...row);
            return <TableRow key={cut}>
              <TableCell numeric>{cut}</TableCell>
              {row.map((value, index) => <TableCell key={names[index]} numeric>{best - value <= tieTolerance ? <strong>{value.toFixed(6)}</strong> : value.toFixed(6)}</TableCell>)}
            </TableRow>;
          })}</TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>;
}
