import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';
import { Stats, Stat, Label } from '@/shared/ui/label';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { loadRanking } from './client';
import type { RankingResponse } from './schemas';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: RankingResponse } | { status: 'error'; message: string };
const methodLabels = { 'counting-sort': 'Counting Sort', 'radix-sort': 'Radix Sort', 'bucket-sort': 'Bucket Sort' };
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'The backend returned an invalid ranking response.';
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return 'Ranking request was rejected.';
    if (error.response?.status === 503) return 'Ranking is unavailable.';
    if (error.response?.status === 500) return 'Ranking failed on the server.';
    if (!error.response) return 'Could not connect to the backend.';
  }
  return 'Could not run ranking. Check the backend connection and configuration.';
}

export function Ranking() {
  const [state, setState] = useState<State>({ status: 'idle' });
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
        <p className="corpus-muted">Three methods, one shared frequency list</p>
      </div>
      <div className="corpus-layout">
        <Card variant="blue" className="corpus-catalog ranking-controls">
          <Badge variant="olive">Counting · Radix · Bucket</Badge>
          <Field controlId="ranking-scope" className="corpus-selection">
            <FieldLabel>Analysis scope</FieldLabel>
            <Select value="all-20-abstracts" disabled>
              <SelectTrigger id="ranking-scope" aria-describedby="ranking-scope-description" radius="soft" appearance="contour" className="-block">
                <span><SelectValue /></span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-20-abstracts">All 20 abstracts</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription id="ranking-scope-description">Fixed scope. Titles, authors and other sections are excluded.</FieldDescription>
          </Field>
          <Button type="button" loading={state.status === 'loading'} onClick={() => { void run(); }}>Run ranking</Button>
          <p>Java single-run timing; not a benchmark. Sorting only: excludes preparation, counting, statistics, common copies and top-term selection.</p>
        </Card>
        <div className="ranking-output" aria-busy={state.status === 'loading'}>
          {state.status === 'idle' && <Empty><EmptyDescription>No ranking has been run.</EmptyDescription></Empty>}
          {state.status === 'loading' && <RankingFeedback message="Running ranking…" />}
          {state.status === 'error' && <RankingFeedback error message={state.message} />}
          {state.status === 'ready' && <RankingResults data={state.data} />}
        </div>
      </div>
    </section>
  );
}
function RankingFeedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) return <div className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></div>;
  return <Alert role="alert" variant="danger" presentation="note">
    <AlertBody className="col-span-full">
      <AlertTitle>Unable to rank</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </AlertBody>
  </Alert>;
}
function RankingResults({ data }: { data: RankingResponse }) {
  const metadata = [
    ['Preprocessing version', data.preprocessing.version],
    ['Scope', data.scope], ['Papers', data.paperCount], ['Total tokens', data.totalTokenCount],
    ['Distinct terms', data.distinctTermCount], ['Max frequency', data.maxFrequency],
    ['Radix base', data.parameters.radixBase], ['Bucket strategy', data.parameters.bucketStrategy],
    ['Bucket count', data.parameters.bucketCount], ['Bucket width', data.parameters.bucketWidth],
  ] as const;
  return <>
    <Card className="ranking-summary">
      <CardHeader><CardTitle>Run details</CardTitle></CardHeader>
      <CardContent>
        <Stats as="dl" className="ranking-metadata">{metadata.map(([label, value]) => <Stat key={label}><Label as="dt">{label}</Label><dd>{value}</dd></Stat>)}</Stats>
        <p className="corpus-muted">NFC · Locale.ROOT lowercase · Unicode letter/mark/digit runs with a letter · No stopword removal or stemming · Manifest order · First-occurrence ties.</p>
      </CardContent>
    </Card>
    {data.results.map((result) => <Card key={result.method} className="ranking-result">
      <CardHeader>
        <CardTitle>{methodLabels[result.method]}</CardTitle>
        <p>Sort duration: <strong>{result.sortMilliseconds} ms</strong></p>
      </CardHeader>
      <CardContent>
        <TableContainer>
          <Table aria-label={`${methodLabels[result.method]} top terms`}>
            <TableCaption>Top {result.topTerms.length} terms · Java order preserved</TableCaption>
            <TableHeader><TableRow><TableHead numeric>Rank</TableHead><TableHead>Term</TableHead><TableHead numeric>Frequency</TableHead></TableRow></TableHeader>
            <TableBody>{result.topTerms.map((entry, index) => <TableRow key={entry.term}><TableCell numeric>{index + 1}</TableCell><TableCell>{entry.term}</TableCell><TableCell numeric>{entry.frequency}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
        {result.topTerms.length === 0 && <p>No terms were returned.</p>}
      </CardContent>
    </Card>)}
  </>;
}
