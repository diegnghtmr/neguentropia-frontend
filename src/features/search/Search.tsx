import { useEffect, useRef, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog, loadDetail } from '../corpus/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Field, FieldLabel, FieldControl, FieldDescription } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { searchPapers } from './client';
import { highlightSegments } from './highlight';
import { apiErrorSchema, searchMethods, type SearchMethod, type SearchResponse } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type Match = { paperId: string; positions: number[]; abstract: string };
type Loaded = { data: SearchResponse; matches: Match[] };
type State = { status: 'idle' | 'loading' } | { status: 'ready'; loaded: Loaded } | { status: 'error'; message: string };
const methodLabels: Record<SearchMethod, string> = { kmp: 'KMP', 'boyer-moore': 'Boyer-Moore', 'rabin-karp': 'Rabin-Karp' };
const apiMessages = {
  INVALID_INPUT: 'El patrón no es válido. Escribe un texto y vuelve a intentarlo.',
  CORPUS_UNAVAILABLE: 'El corpus no está disponible. No se puede buscar.',
  INTERNAL_ERROR: 'El servidor tuvo un error al buscar. Inténtalo de nuevo más tarde.',
};
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'El backend devolvió una respuesta de búsqueda no válida.';
  }
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return apiMessages[parsed.data.code];
    }
  }
  return 'No se pudo ejecutar la búsqueda. Revisa la conexión y la configuración del backend.';
}
function countLabel(count: number) {
  if (count === 1) {
    return '1 coincidencia';
  }
  return `${count} coincidencias`;
}
function paperLabel(count: number) {
  if (count === 1) {
    return '1 artículo';
  }
  return `${count} artículos`;
}

export function Search() {
  const [papers, setPapers] = useState<Papers>([]);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [pattern, setPattern] = useState('');
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
  function changePattern(value: string) {
    active.current?.abort();
    active.current = null;
    setPattern(value);
    setState({ status: 'idle' });
  }
  async function run() {
    if (active.current || pattern === '') {
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await searchPapers({ pattern, methods: searchMethods }, controller.signal);
      const found = data.results[0]!.papers.filter((paper) => paper.positions.length > 0).sort((left, right) => right.positions.length - left.positions.length);
      const details = await Promise.all(found.map((paper) => loadDetail(paper.paperId, controller.signal)));
      const matches = found.map((paper, i) => ({ paperId: paper.paperId, positions: paper.positions, abstract: details[i]!.originalAbstract }));
      if (!controller.signal.aborted) {
        setState({ status: 'ready', loaded: { data, matches } });
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
  return <section aria-labelledby="search-heading" className="corpus" data-motion="off">
    <div className="corpus-intro">
      <h2 id="search-heading">Búsqueda</h2>
      <p className="corpus-muted">Búsqueda exacta de un patrón en los 20 abstracts con KMP, Boyer-Moore y Rabin-Karp.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog">
      <form className="search-form" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <Field controlId="search-pattern" className="corpus-selection">
          <FieldLabel>Patrón</FieldLabel>
          <FieldControl>
            <Input type="text" radius="soft" appearance="contour" value={pattern} autoComplete="off" spellCheck={false} aria-describedby="search-pattern-description" onChange={(event) => changePattern(event.target.value)} />
          </FieldControl>
          <FieldDescription id="search-pattern-description">Se distinguen mayúsculas y acentos.</FieldDescription>
        </Field>
        <Button type="submit" disabled={pattern === '' || state.status === 'loading'}>Buscar</Button>
      </form>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>Escribe un patrón y ejecuta la búsqueda.</EmptyDescription></Empty>}
        {state.status === 'loading' && <SearchSkeleton />}
        {state.status === 'error' && <Feedback message={state.message} />}
        {catalogFailed && <Alert role="alert" variant="warn" presentation="note"><AlertBody className="col-span-full"><AlertDescription>No se pudieron cargar los títulos. Se muestran los identificadores.</AlertDescription></AlertBody></Alert>}
        {state.status === 'ready' && <SearchResults loaded={state.loaded} papers={papers} />}
      </div>
    </div>
  </section>;
}
function SearchSkeleton() {
  return <SkeletonGroup role="status" aria-label="Buscando" aria-busy="true" className="skeleton-view">
    <Skeleton variant="line" style={{ width: '45%' }} />
    <Card className="ranking-result search-timings">
      <SkeletonGroup>
        <Skeleton variant="line" style={{ height: 'var(--s-5)', width: '25%' }} />
        {[0, 1, 2].map((row) => <div key={row} className="skeleton-row" style={{ '--cols': '40% 1fr 4rem' } as CSSProperties}>
          <Skeleton variant="line" />
          <Skeleton variant="line" style={{ width: `${80 - row * 20}%` }} />
          <Skeleton variant="line" />
        </div>)}
      </SkeletonGroup>
    </Card>
    {[0, 1].map((card) => <Card key={card} className="ranking-result">
      <SkeletonGroup>
        <Skeleton variant="line" style={{ height: 'var(--s-5)', width: '60%' }} />
        {[100, 94, 98, 70].map((width, row) => <Skeleton key={row} variant="line" style={{ width: `${width}%` }} />)}
      </SkeletonGroup>
    </Card>)}
  </SkeletonGroup>;
}
function Feedback({ message }: { message: string }) {
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>No se pudo buscar</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function SearchResults({ loaded, papers }: { loaded: Loaded; papers: Papers }) {
  const { data, matches } = loaded;
  const titles = new Map(papers.map((paper) => [paper.id, paper.title]));
  const total = matches.reduce((sum, match) => sum + match.positions.length, 0);
  return <div className="ranking-output">
    {matches.length > 0 && <p role="status">{`${countLabel(total)} en ${paperLabel(matches.length)}.`}</p>}
    <Card className="ranking-result search-timings">
      <CardHeader><CardTitle>Tiempos por método</CardTitle></CardHeader>
      <CardContent>
        <TableContainer>
          <Table aria-label="Tiempos por método">
            <TableCaption>Una sola ejecución. El preprocesamiento prepara el patrón; la búsqueda recorre los abstracts.</TableCaption>
            <TableHeader><TableRow><TableHead>Método</TableHead><TableHead numeric>Preprocesamiento (ms)</TableHead><TableHead numeric>Búsqueda (ms)</TableHead></TableRow></TableHeader>
            <TableBody>{data.results.map((result) => <TableRow key={result.method}>
              <TableCell>{methodLabels[result.method]}</TableCell>
              <TableCell numeric>{result.preprocessingMilliseconds.toFixed(4)}</TableCell>
              <TableCell numeric>{result.searchMilliseconds.toFixed(4)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
    {matches.length === 0 && <Empty><EmptyDescription>Sin coincidencias</EmptyDescription></Empty>}
    {matches.map((match) => <Card key={match.paperId} className="ranking-result" role="article" aria-label={titles.get(match.paperId) ?? match.paperId}>
      <CardHeader>
        <CardTitle>{titles.get(match.paperId) ?? match.paperId}</CardTitle>
        <Badge>{countLabel(match.positions.length)}</Badge>
      </CardHeader>
      <CardContent>
        <p className="corpus-abstract">{highlightSegments(match.abstract, match.positions, data.pattern.length).map((segment, i) => {
          if (segment.match) {
            return <mark key={i}>{segment.text}</mark>;
          }
          return segment.text;
        })}</p>
      </CardContent>
    </Card>)}
  </div>;
}
