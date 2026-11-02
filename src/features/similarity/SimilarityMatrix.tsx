import { useState, type CSSProperties } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { Label } from '@/shared/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { methodLabels } from './methods';
import type { SimilarityMethod, SimilarityResponse } from './schemas';

function scoreOf(data: SimilarityResponse, left: string, right: string, method: SimilarityMethod) {
  for (const pair of data.pairs) {
    if ((pair.left === left && pair.right === right) || (pair.left === right && pair.right === left)) {
      return pair.results.find((result) => result.method === method)?.score;
    }
  }
  return undefined;
}
export function SimilarityMatrix({ data }: { data: SimilarityResponse }) {
  const [method, setMethod] = useState<SimilarityMethod>(data.methods[0]!);
  const name = `Matriz de similitud: ${methodLabels[method]}`;
  return <Card className="similarity-result similarity-matrix">
    <CardHeader><CardTitle>Matriz de similitud</CardTitle></CardHeader>
    <CardContent>
      <div className="similarity-matrix-method">
        <Label htmlFor="similarity-matrix-method">Método de la matriz</Label>
        <Select value={method} onValueChange={(value) => setMethod(value as SimilarityMethod)}>
          <SelectTrigger id="similarity-matrix-method" radius="soft" appearance="contour">
            <span><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            {data.methods.map((item) => <SelectItem key={item} value={item}>{methodLabels[item]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <TableContainer><Table aria-label={name}>
        <TableHeader><TableRow>
          <TableHead><span className="sr-only">Artículo</span></TableHead>
          {data.paperIds.map((id) => <TableHead key={id} scope="col">{id}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>{data.paperIds.map((row) => <TableRow key={row}>
          <TableHead scope="row">{row}</TableHead>
          {data.paperIds.map((column) => {
            if (row === column) return <TableCell key={column} aria-label="Mismo artículo, sin puntaje" />;
            const score = scoreOf(data, row, column, method);
            if (score === undefined) return <TableCell key={column} />;
            return <TableCell key={column} numeric className="similarity-matrix-cell" style={{ '--score': Math.max(0, score) } as CSSProperties}>{score.toFixed(4)}</TableCell>;
          })}
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </CardContent>
  </Card>;
}
