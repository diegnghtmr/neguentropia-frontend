import { useEffect, useRef, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog } from '../corpus/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { Checkbox, CheckboxBody, CheckboxGroup } from '@/shared/ui/checkbox';
import { MultiSelect } from '@/shared/ui/multi-select';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription } from '@/shared/ui/field';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { MotionPresence, MotionSurface } from '@/shared/ui/presence';
import { loadSimilarity } from './client';
import { apiErrorSchema, similarityMethods, type SimilarityMethod, type SimilarityResponse, type SimilarityResult } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type CatalogState = { status: 'loading' } | { status: 'ready'; papers: Papers } | { status: 'error'; message: string };
type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: SimilarityResponse } | { status: 'error'; message: string };
const methodLabels: Record<SimilarityMethod, string> = { levenshtein: 'Levenshtein', lcs: 'LCS', 'tf-idf-cosine': 'Coseno TF-IDF', jaccard: 'Jaccard', 'gemini-embeddings': 'Embeddings de Gemini', 'local-embeddings': 'Embeddings locales' };
const apiMessages = {
  INVALID_INPUT: 'La solicitud no es válida. Revisa los artículos y los métodos elegidos.',
  PAPER_NOT_FOUND: 'No se encontró alguno de los artículos elegidos. Recarga la página para actualizar el catálogo.',
  CORPUS_UNAVAILABLE: 'El corpus no está disponible. No se puede calcular la similitud.',
  PROVIDER_UNAVAILABLE: 'Los vectores de embeddings no están disponibles. Prueba con otros métodos.',
  INTERNAL_ERROR: 'El servidor tuvo un error al calcular la similitud. Inténtalo de nuevo más tarde.',
};
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'El backend devolvió una respuesta no válida.';
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) return apiMessages[parsed.data.code];
  }
  return 'No se pudo completar la solicitud. Revisa la conexión y la configuración del backend.';
}

export function Similarity() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<SimilarityMethod[]>([...similarityMethods]);
  const [state, setState] = useState<State>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setCatalog({ status: 'ready', papers: data.papers }); },
      (error: unknown) => { if (!controller.signal.aborted) setCatalog({ status: 'error', message: errorMessage(error) }); },
    );
    return () => { controller.abort(); active.current?.abort(); };
  }, []);
  function clearResult() {
    active.current?.abort();
    active.current = null;
    setState({ status: 'idle' });
  }
  function chooseIds(ids: string[]) {
    if (catalog.status !== 'ready') return;
    clearResult();
    setSelectedIds(catalog.papers.filter((paper) => ids.includes(paper.id)).map((paper) => paper.id));
  }
  const allSelected = catalog.status === 'ready' && selectedIds.length === catalog.papers.length;
  async function run() {
    if (active.current || catalog.status !== 'ready') return;
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await loadSimilarity({
        paperIds: catalog.papers.filter((paper) => selectedIds.includes(paper.id)).map((paper) => paper.id),
        methods: similarityMethods.filter((method) => selectedMethods.includes(method)),
      }, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'ready', data });
    } catch (error: unknown) {
      if (!controller.signal.aborted) setState({ status: 'error', message: errorMessage(error) });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return <section aria-labelledby="similarity-heading" className="corpus similarity" data-motion="off">
    <div className="corpus-intro">
      <h2 id="similarity-heading">Similitud</h2>
      <p className="corpus-muted">Compara abstracts con métodos clásicos y embeddings.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog similarity-controls">
        <div className="corpus-selection similarity-papers-field">
          {catalog.status === 'loading' && <PapersSkeleton />}
          {catalog.status === 'error' && <Feedback message={catalog.message} />}
          {catalog.status === 'ready' && <>
            <MultiSelect
              label="Artículos"
              options={catalog.papers.map((paper) => ({ value: paper.id, label: `${paper.id} ${paper.title}`, tokenLabel: paper.id }))}
              adornment="none"
              value={selectedIds}
              onValueChange={chooseIds}
              placeholder="Elige dos o más"
              searchPlaceholder="Buscar por título o id"
              emptyMessage="No hay artículos disponibles"
              noResultsMessage="No hay artículos que coincidan"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => chooseIds(allSelected ? [] : catalog.papers.map((paper) => paper.id))}>
              {allSelected ? 'Quitar todos' : `Seleccionar los ${catalog.papers.length}`}
            </Button>
          </>}
        </div>
        <Field className="corpus-selection">
          <fieldset className="similarity-selection">
            <legend>Métodos</legend>
            <FieldDescription>Elige al menos un método.</FieldDescription>
            <CheckboxGroup className="similarity-methods">{similarityMethods.map((method) =>
              <Checkbox key={method} size="sm" checked={selectedMethods.includes(method)} onCheckedChange={(checked) => {
                clearResult(); setSelectedMethods((methods) => checked === true ? [...methods, method] : methods.filter((item) => item !== method));
              }}><CheckboxBody>{methodLabels[method]}</CheckboxBody></Checkbox>,
            )}</CheckboxGroup>
          </fieldset>
        </Field>
        <Button type="button" disabled={catalog.status !== 'ready' || selectedIds.length < 2 || selectedMethods.length === 0 || state.status === 'loading'} onClick={() => { void run(); }}>Calcular similitud</Button>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>Elige al menos dos artículos y ejecuta la comparación.</EmptyDescription></Empty>}
        {state.status === 'loading' && <ResultsSkeleton />}
        {state.status === 'error' && <Feedback message={state.message} />}
        {state.status === 'ready' && catalog.status === 'ready' && <SimilarityResults data={state.data} papers={catalog.papers} />}
      </div>
    </div>
  </section>;
}
function PapersSkeleton() {
  return <SkeletonGroup role="status" aria-label="Cargando los artículos" aria-busy="true">
    <Skeleton variant="line" style={{ width: '5rem' }} />
    <Skeleton variant="pill" style={{ height: 'var(--ctl-lg)' }} />
    <Skeleton variant="line" style={{ width: '9rem' }} />
  </SkeletonGroup>;
}
function ResultsSkeleton() {
  return <SkeletonGroup role="status" aria-label="Calculando la similitud" aria-busy="true" className="skeleton-view">
    <Card className="ranking-result">
      <SkeletonGroup>
        <div className="skeleton-row" style={{ '--cols': '1fr 3rem 1fr' } as CSSProperties}>
          <Skeleton variant="line" style={{ height: 'var(--s-5)' }} />
          <Skeleton variant="pill" style={{ height: 'var(--s-5)' }} />
          <Skeleton variant="line" style={{ height: 'var(--s-5)' }} />
        </div>
        {Array.from({ length: 6 }, (_, row) => <div key={row} className="skeleton-row" style={{ '--cols': '30% 4rem 1fr' } as CSSProperties}>
          <Skeleton variant="line" />
          <Skeleton variant="line" />
          <Skeleton variant="line" style={{ width: `${90 - ((row * 11) % 40)}%` }} />
        </div>)}
      </SkeletonGroup>
    </Card>
  </SkeletonGroup>;
}
function Feedback({ message }: { message: string }) {
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>No se pudo comparar</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function Explanation({ result }: { result: SimilarityResult }) {
  switch (result.method) {
    case 'levenshtein': return <><p>Distancia: {result.distance}</p><p>Longitud izquierda: {result.leftLength}</p><p>Longitud derecha: {result.rightLength}</p></>;
    case 'lcs': return <><p>Longitud: {result.length}</p><p>Tokens izquierdos: {result.leftTokenCount}</p><p>Tokens derechos: {result.rightTokenCount}</p></>;
    case 'tf-idf-cosine': return <><p>Dimensión: {result.dimension}</p><p>Artículos de ajuste: {result.fitPaperCount}</p></>;
    case 'gemini-embeddings':
    case 'local-embeddings': {
      return <><p>Modelo: {result.model}</p><p>Dimensión: {result.dimension}</p></>;
    }
    case 'jaccard': return <><p>Intersección: {result.intersectionSize}</p><p>Unión: {result.unionSize}</p></>;
  }
}
function SimilarityResults({ data, papers }: { data: SimilarityResponse; papers: Papers }) {
  const title = (id: string) => papers.find((paper) => paper.id === id)!.title;
  return <div className="ranking-output">
    <MotionPresence>{data.pairs.map((pair) => {
      const label = `${title(pair.left)} vs ${title(pair.right)}`;
      return <MotionSurface key={JSON.stringify([pair.left, pair.right])} preset="soften" exitDuration={0}>
        <Card className="similarity-result">
          <CardHeader><CardTitle className="similarity-pair" aria-label={label}>
            <span>{title(pair.left)}</span><Badge variant="ink" aria-hidden="true">vs</Badge><span>{title(pair.right)}</span>
          </CardTitle></CardHeader>
          <CardContent><TableContainer><Table aria-label={label}>
            <TableHeader><TableRow><TableHead>Método</TableHead><TableHead numeric>Puntaje</TableHead><TableHead>Explicación</TableHead></TableRow></TableHeader>
            <TableBody>{pair.results.map((result) => <TableRow key={result.method}>
              <TableCell>{methodLabels[result.method]}</TableCell><TableCell numeric>{result.score.toFixed(4)}</TableCell>
              <TableCell><Explanation result={result} /></TableCell>
            </TableRow>)}</TableBody>
            <TableCaption className="caption-bottom">Los puntajes clásicos van de 0 a 1 y los cosenos de embeddings, de -1 a 1.</TableCaption>
          </Table></TableContainer></CardContent>
        </Card>
      </MotionSurface>;
    })}</MotionPresence>
  </div>;
}
