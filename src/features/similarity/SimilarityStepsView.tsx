import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { loadSimilaritySteps } from './client';
import { errorMessage } from './messages';
import type { SimilaritySteps } from './schemas';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; steps: SimilaritySteps } | { status: 'error'; message: string };

function exponent(value: number, digits: number) {
  return value.toExponential(digits).replace(/e([+-])(\d)$/, 'e$10$2');
}
function symbol(character: string) {
  if (character === ' ') return '␣';
  return character;
}
function CornerTable({ label, columns, rows, cells }: { label: string; columns: string[]; rows: string[]; cells: number[][] }) {
  return <TableContainer><Table aria-label={label} className="similarity-corner">
    <TableHeader><TableRow>
      <TableHead><span className="sr-only">Fila</span></TableHead>
      <TableHead scope="col">∅</TableHead>
      {columns.map((column, index) => <TableHead key={index} scope="col">{column}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{cells.map((cellRow, i) => <TableRow key={i}>
      <TableHead scope="row">{i === 0 ? '∅' : rows[i - 1]}</TableHead>
      {cellRow.map((cell, j) => <TableCell key={j} numeric>{cell}</TableCell>)}
    </TableRow>)}</TableBody>
  </Table></TableContainer>;
}
function StepsContent({ steps }: { steps: SimilaritySteps }) {
  const { levenshtein, lcs, tfIdf } = steps;
  return <div className="similarity-steps-content">
    <section aria-label="Levenshtein">
      <h4>Levenshtein</h4>
      <p>Esquina de la matriz: primeros {levenshtein.leftPrefix.length} y {levenshtein.rightPrefix.length} caracteres de cada texto unido (␣ es el espacio).</p>
      <CornerTable label="Esquina de la matriz de Levenshtein" columns={[...levenshtein.rightPrefix].map(symbol)} rows={[...levenshtein.leftPrefix].map(symbol)} cells={levenshtein.cells} />
      <p>{`D[${levenshtein.leftLength}][${levenshtein.rightLength}] = ${levenshtein.distance}`}</p>
      <p>{`puntuación = 1 − distancia / max(m, n) = 1 − ${levenshtein.distance} / max(${levenshtein.leftLength}, ${levenshtein.rightLength}) = ${levenshtein.score.toFixed(10)}`}</p>
    </section>
    <section aria-label="LCS">
      <h4>LCS</h4>
      <p>Esquina de la matriz: primeros {lcs.leftTokens.length} y {lcs.rightTokens.length} tokens de cada texto.</p>
      <CornerTable label="Esquina de la matriz de LCS" columns={lcs.rightTokens} rows={lcs.leftTokens} cells={lcs.cells} />
      <p>{`L[${lcs.leftTokenCount}][${lcs.rightTokenCount}] = ${lcs.length}`}</p>
      <p>{`puntuación = 2 × L / (p + q) = 2 × ${lcs.length} / (${lcs.leftTokenCount} + ${lcs.rightTokenCount}) = ${lcs.score.toFixed(10)}`}</p>
    </section>
    <section aria-label="Coseno TF-IDF">
      <h4>Coseno TF-IDF</h4>
      <p>Términos compartidos con mayor producto de pesos.</p>
      <TableContainer><Table aria-label="Términos compartidos con mayor producto">
        <TableHeader><TableRow>
          <TableHead>Término</TableHead><TableHead numeric>Recuento A</TableHead><TableHead numeric>Recuento B</TableHead><TableHead numeric>DF</TableHead>
          <TableHead numeric>IDF</TableHead><TableHead numeric>Peso A</TableHead><TableHead numeric>Peso B</TableHead><TableHead numeric>Producto</TableHead>
        </TableRow></TableHeader>
        <TableBody>{tfIdf.terms.map((term) => <TableRow key={term.term}>
          <TableCell>{term.term}</TableCell><TableCell numeric>{term.leftCount}</TableCell><TableCell numeric>{term.rightCount}</TableCell>
          <TableCell numeric>{term.documentFrequency}</TableCell><TableCell numeric>{term.idf.toFixed(6)}</TableCell>
          <TableCell numeric>{term.leftWeight.toFixed(6)}</TableCell><TableCell numeric>{term.rightWeight.toFixed(6)}</TableCell>
          <TableCell numeric>{exponent(term.product, 4)}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
      <p>{`⟨a, b⟩ = ${exponent(tfIdf.dotProduct, 6)}`}</p>
      <p>{`‖a‖ = ${tfIdf.leftNorm.toFixed(6)}`}</p>
      <p>{`‖b‖ = ${tfIdf.rightNorm.toFixed(6)}`}</p>
      <p>{`coseno = ${tfIdf.cosine.toFixed(10)}`}</p>
      <p>{`ángulo = ${tfIdf.angleDegrees.toFixed(4)}°`}</p>
    </section>
  </div>;
}
function StepsSkeleton() {
  return <SkeletonGroup role="status" aria-label="Cargando los pasos" aria-busy="true">
    <Skeleton variant="line" style={{ width: '40%' }} />
    <Skeleton variant="line" />
    <Skeleton variant="line" style={{ width: '80%' }} />
  </SkeletonGroup>;
}
export function SimilarityStepsView({ leftId, rightId }: { leftId: string; rightId: string }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  async function load() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const steps = await loadSimilaritySteps({ leftId, rightId }, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'ready', steps });
    } catch (error: unknown) {
      if (!controller.signal.aborted) setState({ status: 'error', message: errorMessage(error) });
    }
  }
  function hide() {
    active.current?.abort();
    setState({ status: 'idle' });
  }
  return <div className="similarity-steps">
    {state.status === 'ready' || state.status === 'loading'
      ? <Button type="button" variant="ghost" size="sm" onClick={hide}>Ocultar pasos</Button>
      : <Button type="button" variant="ghost" size="sm" onClick={() => { void load(); }}>Ver paso a paso</Button>}
    {state.status === 'loading' && <StepsSkeleton />}
    {state.status === 'error' && <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>No se pudieron cargar los pasos</AlertTitle><AlertDescription>{state.message}</AlertDescription></AlertBody></Alert>}
    {state.status === 'ready' && <StepsContent steps={state.steps} />}
  </div>;
}
