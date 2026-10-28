import { useEffect, useRef, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog } from '../corpus/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { TableContainer, Table, TableCaption, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { MotionSurface } from '@/shared/ui/presence';
import { loadClustering } from './client';
import { Dendrogram } from './Dendrogram';
import { MergeTable } from './MergeTable';
import { groupColor, groupSoft, pillInk } from './groupColors';
import { apiErrorSchema, type ClusteringMethod, type ClusteringResponse, type ClusteringResult } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: ClusteringResponse } | { status: 'error'; message: string };
const methodLabels: Record<ClusteringMethod, string> = { 'single-linkage': 'Single linkage', 'complete-linkage': 'Complete linkage', 'average-linkage': 'Average linkage' };
const counts = Array.from({ length: 18 }, (_, i) => String(i + 2));
const apiMessages = {
  INVALID_INPUT: 'La cantidad de grupos no es válida. Elige un valor entre 2 y 19.',
  CORPUS_UNAVAILABLE: 'El corpus no está disponible. No se puede agrupar.',
  INTERNAL_ERROR: 'El servidor tuvo un error al agrupar. Inténtalo de nuevo más tarde.',
};
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'El backend devolvió una respuesta de agrupamiento no válida.';
  }
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return apiMessages[parsed.data.code];
    }
  }
  return 'No se pudo ejecutar el agrupamiento. Revisa la conexión y la configuración del backend.';
}
function paperCountLabel(count: number) {
  if (count === 1) {
    return '1 artículo';
  }
  return `${count} artículos`;
}

export function Clustering() {
  const [papers, setPapers] = useState<Papers>([]);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [count, setCount] = useState('2');
  const [state, setState] = useState<State>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setPapers(data.papers);
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setCatalogFailed(true);
        }
      },
    );
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);
  function changeCount(value: string) {
    active.current?.abort();
    active.current = null;
    setCount(value);
    setState({ status: 'idle' });
  }
  async function run() {
    if (active.current) {
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await loadClustering({ clusterCount: Number(count) }, controller.signal);
      if (!controller.signal.aborted) {
        setState({ status: 'ready', data });
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setState({ status: 'error', message: errorMessage(error) });
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
      }
    }
  }
  return <section aria-labelledby="clustering-heading" className="corpus" data-motion="off">
    <div className="corpus-intro">
      <h2 id="clustering-heading">Agrupamiento</h2>
      <p className="corpus-muted">Tres criterios de enlace jerárquico sobre las mismas distancias de coseno TF-IDF.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog">
        <Field controlId="cluster-count" className="corpus-selection">
          <FieldLabel>Cantidad de grupos</FieldLabel>
          <Select value={count} onValueChange={changeCount} containerProps={{ className: 'block w-full min-w-0' }}>
            <SelectTrigger id="cluster-count" aria-describedby="cluster-count-description" radius="soft" appearance="contour" className="-block">
              <span><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              {counts.map((value) => <SelectItem key={value} value={value} adornment="none">{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldDescription id="cluster-count-description">El árbol se corta en esta cantidad de grupos, de 2 a 19.</FieldDescription>
        </Field>
        <Button type="button" disabled={state.status === 'loading'} onClick={() => { void run(); }}>Ejecutar agrupamiento</Button>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>Elige la cantidad de grupos y ejecuta el agrupamiento.</EmptyDescription></Empty>}
        {state.status === 'loading' && <ClusteringSkeleton />}
        {state.status === 'error' && <Feedback message={state.message} />}
        {catalogFailed && <Alert role="alert" variant="warn" presentation="note"><AlertBody className="col-span-full"><AlertDescription>No se pudieron cargar los títulos. Se muestran los identificadores.</AlertDescription></AlertBody></Alert>}
        {state.status === 'ready' && <ClusteringResults data={state.data} papers={papers} />}
      </div>
    </div>
  </section>;
}
function ClusteringSkeleton() {
  return <SkeletonGroup role="status" aria-label="Ejecutando el agrupamiento" aria-busy="true" className="skeleton-view">
    <SkeletonGroup>
      {[0, 1, 2].map((row) => <div key={row} className="skeleton-row" style={{ '--cols': '40% 4rem 1fr' } as CSSProperties}>
        <Skeleton variant="line" />
        <Skeleton variant="line" />
        <Skeleton variant="pill" style={{ height: 'var(--s-4)', width: `${60 - row * 15}%` }} />
      </div>)}
    </SkeletonGroup>
    <Card className="ranking-result">
      <SkeletonGroup>
        <Skeleton variant="line" style={{ height: 'var(--s-5)', width: '35%' }} />
        <Skeleton variant="card" style={{ height: '16rem', width: '100%' }} />
        {[0, 1].map((row) => <div key={row} className="skeleton-row" style={{ '--cols': '2.5rem 1fr' } as CSSProperties}>
          <Skeleton variant="pill" style={{ height: 'var(--s-5)' }} />
          <Skeleton variant="line" style={{ width: `${85 - row * 25}%` }} />
        </div>)}
      </SkeletonGroup>
    </Card>
  </SkeletonGroup>;
}
function Feedback({ message }: { message: string }) {
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>No se pudo agrupar</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function highestSilhouette(results: readonly ClusteringResult[]) {
  const best = Math.max(...results.map((result) => result.silhouette));
  const winners = results.filter((result) => result.silhouette === best);
  if (winners.length === results.length) {
    return [];
  }
  return winners.map((result) => result.method);
}
function ClusteringResults({ data, papers }: { data: ClusteringResponse; papers: Papers }) {
  const titles = new Map(papers.map((paper) => [paper.id, paper.title]));
  const titleOf = (paperId: string) => titles.get(paperId) ?? paperId;
  const leafLabels = data.leaves.map((leaf) => leaf.paperId);
  const leafTitles = data.leaves.map((leaf) => titleOf(leaf.paperId));
  const best = highestSilhouette(data.results);
  const leafGroupsOf = (result: ClusteringResult) => data.leaves.map((leaf) => result.partition.findIndex((group) => group.paperIds.includes(leaf.paperId)));
  return <div className="ranking-output">
    {best.length === 0 && <p role="status">Todos los métodos tienen la misma silueta.</p>}
    <TableContainer>
      <Table aria-label="Silueta por método">
        <TableCaption className="sr-only">Silueta por método</TableCaption>
        <TableHeader><TableRow><TableHead>Método</TableHead><TableHead numeric>Silueta</TableHead><TableHead>Tamaños de los grupos</TableHead></TableRow></TableHeader>
        <TableBody>{data.results.map((result) => <TableRow key={result.method}>
          <TableCell>{methodLabels[result.method]}{best.includes(result.method) && <>{' '}<Badge>Mayor silueta</Badge></>}</TableCell>
          <TableCell numeric>{result.silhouette.toFixed(4)}</TableCell>
          <TableCell>{result.partition.map((group) => group.paperIds.length).join(', ')}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    {data.results.map((result, index) => <MotionSurface key={result.method} preset="soften" delay={0.07 * index} exitDuration={0}>
      <Card className="ranking-result">
        <CardHeader>
          <CardTitle>{methodLabels[result.method]}</CardTitle>
          {best.includes(result.method) && <Badge>Mayor silueta</Badge>}
        </CardHeader>
        <CardContent>
          <p>{`Silueta ${result.silhouette.toFixed(4)}`}</p>
          <div className="dendrogram-scroll">
            <Dendrogram name={methodLabels[result.method]} merges={result.merges} leafLabels={leafLabels} leafTitles={leafTitles} clusterCount={result.partition.length} leafGroups={leafGroupsOf(result)} />
          </div>
          <h4>Grupos</h4>
          <ul aria-label={`Grupos de ${methodLabels[result.method]}`} className="group-blocks">
            {result.partition.map((group, i) => <li key={i} data-group-block className="group-block" style={{ backgroundColor: groupSoft(i) }}>
              <span className="group-heading">{`Grupo ${i + 1} (${paperCountLabel(group.paperIds.length)})`}</span>
              <ul>{group.paperIds.map((paperId) => <li key={paperId}>{titleOf(paperId) === paperId ? paperId : <><span className="paper-id" style={{ backgroundColor: groupColor(i), color: pillInk(i) }}>{paperId}</span>{' '}{titleOf(paperId)}</>}</li>)}</ul>
            </li>)}
          </ul>
          <details>
            <summary>{`Pasos de fusión (${result.merges.length})`}</summary>
            <MergeTable name={methodLabels[result.method]} merges={result.merges} leafLabels={leafLabels} leafGroups={leafGroupsOf(result)} clusterCount={result.partition.length} />
          </details>
        </CardContent>
      </Card>
    </MotionSurface>)}
  </div>;
}
