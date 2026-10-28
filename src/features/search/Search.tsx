import { useEffect, useRef, useState } from 'react';
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
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { searchPapers } from './client';
import { highlightSegments } from './highlight';
import { apiErrorSchema, searchMethods, type SearchMethod, type SearchResponse } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type Match = { paperId: string; positions: number[]; abstract: string };
type Loaded = { data: SearchResponse; matches: Match[] };
type State = { status: 'idle' | 'loading' } | { status: 'ready'; loaded: Loaded } | { status: 'error'; message: string };
const methodLabels: Record<SearchMethod, string> = { kmp: 'KMP', 'boyer-moore': 'Boyer-Moore', 'rabin-karp': 'Rabin-Karp' };
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'The backend returned an invalid search response.';
  }
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return `${parsed.data.code}: ${parsed.data.message}`;
    }
  }
  return 'Could not run the search. Check the backend connection and configuration.';
}
function samePositions(data: SearchResponse) {
  const [first, ...others] = data.results;
  return others.every((result) => result.papers.every((paper, i) => {
    const expected = first!.papers[i]!.positions;
    return paper.positions.length === expected.length && paper.positions.every((position, j) => position === expected[j]);
  }));
}
function countLabel(count: number) {
  if (count === 1) {
    return '1 match';
  }
  return `${count} matches`;
}

export function Search() {
  const [papers, setPapers] = useState<Papers>([]);
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
      () => undefined,
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
      const found = data.results[0]!.papers.filter((paper) => paper.positions.length > 0);
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
      <h2 id="search-heading">Search</h2>
      <p className="corpus-muted">Exact pattern search over the 20 original abstracts with KMP, Boyer-Moore and Rabin-Karp.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog">
      <form onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <Field controlId="search-pattern" className="corpus-selection">
          <FieldLabel>Pattern</FieldLabel>
          <FieldControl>
            <Input type="text" radius="soft" appearance="contour" value={pattern} autoComplete="off" spellCheck={false} aria-describedby="search-pattern-description" onChange={(event) => changePattern(event.target.value)} />
          </FieldControl>
          <FieldDescription id="search-pattern-description">The text is used as typed. Case and accents matter.</FieldDescription>
        </Field>
        <Button type="submit" disabled={pattern === '' || state.status === 'loading'} loading={state.status === 'loading'}>Search</Button>
      </form>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>No search has been run.</EmptyDescription></Empty>}
        {state.status === 'loading' && <Feedback message="Searching" />}
        {state.status === 'error' && <Feedback error message={state.message} />}
        {state.status === 'ready' && <SearchResults loaded={state.loaded} papers={papers} />}
      </div>
    </div>
  </section>;
}
function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) {
    return <div className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></div>;
  }
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>Unable to search</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function SearchResults({ loaded, papers }: { loaded: Loaded; papers: Papers }) {
  const { data, matches } = loaded;
  const titles = new Map(papers.map((paper) => [paper.id, paper.title]));
  const total = matches.reduce((sum, match) => sum + match.positions.length, 0);
  return <div className="ranking-output">
    <Card className="ranking-result">
      <CardHeader><CardTitle>Timings</CardTitle></CardHeader>
      <CardContent>
        <TableContainer>
          <Table aria-label="Search timings">
            <TableCaption>Single run, in milliseconds. Preprocessing prepares the pattern; search covers the 20 abstracts.</TableCaption>
            <TableHeader><TableRow><TableHead>Method</TableHead><TableHead numeric>Preprocessing (ms)</TableHead><TableHead numeric>Search (ms)</TableHead></TableRow></TableHeader>
            <TableBody>{data.results.map((result) => <TableRow key={result.method}>
              <TableCell>{methodLabels[result.method]}</TableCell>
              <TableCell numeric>{result.preprocessingMilliseconds.toFixed(4)}</TableCell>
              <TableCell numeric>{result.searchMilliseconds.toFixed(4)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
        <p role="status">{samePositions(data) ? 'All three methods returned the same positions.' : 'The methods returned different positions.'}</p>
        <p>{`Total matches: ${total}`}</p>
      </CardContent>
    </Card>
    {matches.length === 0 && <Empty><EmptyDescription>No matches</EmptyDescription></Empty>}
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
