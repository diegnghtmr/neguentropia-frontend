import { useEffect, useRef, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Field, FieldLabel } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { MotionPresence, MotionSurface } from '@/shared/ui/presence';
import { Stats, Stat, Label } from '@/shared/ui/label';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { loadRanking } from './client';
import type { RankingResponse } from './schemas';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: RankingResponse } | { status: 'error'; message: string };
const methodLabels = { 'counting-sort': 'Counting Sort', 'radix-sort': 'Radix Sort', 'bucket-sort': 'Bucket Sort' };
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'El backend devolvió una respuesta de ranking no válida.';
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return 'Se rechazó la solicitud de ranking.';
    if (error.response?.status === 503) return 'El ranking no está disponible.';
    if (error.response?.status === 500) return 'El ranking falló en el servidor.';
    if (!error.response) return 'No se pudo conectar con el backend.';
  }
  return 'No se pudo ejecutar el ranking. Revisa la conexión y la configuración del backend.';
}

export function Ranking() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (state.status !== 'loading') return;
    const timer = setTimeout(() => setSlow(true), 300);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [state.status]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  async function run() {
    if (active.current && !active.current.signal.aborted) return;
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await loadRanking(controller.signal);
      if (!controller.signal.aborted) setState({ status: 'ready', data });
    } catch (error: unknown) {
      if (!controller.signal.aborted) setState({ status: 'error', message: errorMessage(error) });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return (
    <section aria-labelledby="ranking-heading" className="corpus ranking" data-motion="off">
      <div className="corpus-intro">
        <h2 id="ranking-heading">Ranking</h2>
        <p className="corpus-muted">Tres métodos de ordenamiento sobre las mismas frecuencias de términos.</p>
      </div>
      <div className="corpus-layout">
        <Card variant="blue" className="corpus-catalog ranking-controls">
          <Field controlId="ranking-scope" className="corpus-selection">
            <FieldLabel>Alcance del análisis</FieldLabel>
            <Select value="all-20-abstracts" disabled>
              <SelectTrigger id="ranking-scope" radius="soft" appearance="contour" className="-block">
                <span><SelectValue /></span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-20-abstracts">Los 20 abstracts</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="button" disabled={state.status === 'loading'} onClick={() => { void run(); }}>Ejecutar ranking</Button>
        </Card>
        <div className="ranking-output" aria-busy={state.status === 'loading'}>
          <MotionPresence mode="wait">
            {state.status === 'idle' && <MotionSurface key="idle" preset="soften" exitDuration={0.2}><Empty><EmptyDescription>Aún no se ha ejecutado el ranking.</EmptyDescription></Empty></MotionSurface>}
            {state.status === 'loading' && slow && <MotionSurface key="loading" preset="fade"><RankingSkeleton /></MotionSurface>}
            {state.status === 'error' && <RankingFeedback key="error" message={state.message} />}
            {state.status === 'ready' && <RankingResults key="ready" data={state.data} />}
          </MotionPresence>
        </div>
      </div>
    </section>
  );
}
function RankingSkeleton() {
  return <SkeletonGroup role="status" aria-label="Ejecutando el ranking…" aria-busy="true" className="skeleton-view">
    {[0, 1, 2].map((card) => <Card key={card} className="ranking-result">
      <SkeletonGroup>
        <Skeleton variant="line" style={{ height: 'var(--s-5)', width: '40%' }} />
        {Array.from({ length: 8 }, (_, row) => <div key={row} className="skeleton-row" style={{ '--cols': '2.5rem 1fr 4rem' } as CSSProperties}>
          <Skeleton variant="line" />
          <Skeleton variant="line" style={{ width: `${90 - ((row * 17) % 40)}%` }} />
          <Skeleton variant="line" />
        </div>)}
      </SkeletonGroup>
    </Card>)}
  </SkeletonGroup>;
}
function RankingFeedback({ message }: { message: string }) {
  return <MotionSurface preset="soften" exitDuration={0.2}>
    <Alert role="alert" variant="danger" presentation="note">
      <AlertBody className="col-span-full">
        <AlertTitle>No se pudo ejecutar el ranking</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </AlertBody>
    </Alert>
  </MotionSurface>;
}
function RankingResults({ data }: { data: RankingResponse }) {
  const metadata = [
    ['Versión de preprocesamiento', data.preprocessing.version],
    ['Normalización Unicode', data.preprocessing.unicodeNormalization], ['Regla de mayúsculas', data.preprocessing.caseRule],
    ['Regla de tokens', data.preprocessing.tokenRule], ['Stopwords eliminadas', data.preprocessing.stopwordsRemoved ? 'Sí' : 'No'],
    ['Stemming aplicado', data.preprocessing.stemmingApplied ? 'Sí' : 'No'], ['Orden de documentos', data.preprocessing.documentOrder],
    ['Desempate de términos', data.preprocessing.termTieBreak],
    ['Alcance', data.scope], ['Artículos', data.paperCount], ['Total de tokens', data.totalTokenCount],
    ['Términos distintos', data.distinctTermCount], ['Frecuencia máxima', data.maxFrequency],
    ['Base de Radix', data.parameters.radixBase], ['Estrategia de Bucket', data.parameters.bucketStrategy],
    ['Cantidad de buckets', data.parameters.bucketCount], ['Ancho de bucket', data.parameters.bucketWidth],
  ] as const;
  return <div className="ranking-output">
    <MotionSurface preset="soften" exitDuration={0.2}><Card className="ranking-summary">
      <CardHeader><CardTitle>Detalles de la ejecución</CardTitle></CardHeader>
      <CardContent>
        <Stats as="dl" className="ranking-metadata">{metadata.map(([label, value]) => <Stat key={label}><Label as="dt">{label}</Label><dd>{value}</dd></Stat>)}</Stats>
      </CardContent>
    </Card></MotionSurface>
    {data.results.map((result, index) => <MotionSurface key={result.method} preset="soften" delay={0.07 * (index + 1)} exitDuration={0.2}><Card className="ranking-result">
      <CardHeader>
        <CardTitle>{methodLabels[result.method]}</CardTitle>
        <p>Duración del ordenamiento: <strong>{result.sortMilliseconds} ms</strong></p>
      </CardHeader>
      <CardContent>
        <TableContainer>
          <Table aria-label={`Términos principales de ${methodLabels[result.method]}`}>
            <TableCaption>Primeros {result.topTerms.length} términos</TableCaption>
            <TableHeader><TableRow><TableHead numeric>Posición</TableHead><TableHead>Término</TableHead><TableHead numeric>Frecuencia</TableHead></TableRow></TableHeader>
            <TableBody>{result.topTerms.map((entry, index) => <TableRow key={entry.term}><TableCell numeric>{index + 1}</TableCell><TableCell>{entry.term}</TableCell><TableCell numeric>{entry.frequency}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
        {result.topTerms.length === 0 && <p>No se devolvieron términos.</p>}
      </CardContent>
    </Card></MotionSurface>)}
  </div>;
}
