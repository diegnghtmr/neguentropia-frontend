import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
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
          <div className="corpus-selection">
            <label htmlFor="ranking-scope">Analysis scope</label>
            <NativeSelect id="ranking-scope" value="all-20-abstracts" disabled radius="soft" appearance="contour" className="w-full">
              <NativeSelectOption value="all-20-abstracts">All 20 abstracts</NativeSelectOption>
            </NativeSelect>
          </div>
          <p>Fixed scope. Titles, authors and other sections are excluded.</p>
          <button type="button" className="workspace-action" disabled={state.status === 'loading'} onClick={() => { void run(); }}>Run ranking</button>
          <p>Java single-run timing; not a benchmark. Sorting only: excludes preparation, counting, statistics, common copies and top-term selection.</p>
        </Card>
        <div className="ranking-output" aria-busy={state.status === 'loading'}>
          {state.status === 'idle' && <Card variant="cream" className="corpus-empty"><p>No ranking has been run.</p></Card>}
          {state.status === 'loading' && <RankingFeedback message="Running ranking…" />}
          {state.status === 'error' && <RankingFeedback error message={state.message} />}
          {state.status === 'ready' && <RankingResults data={state.data} />}
        </div>
      </div>
    </section>
  );
}
function RankingFeedback({ message, error = false }: { message: string; error?: boolean }) {
  return <Alert role={error ? 'alert' : 'status'} variant={error ? 'danger' : 'info'} presentation="note">
    <AlertBody className="col-span-full">
      <AlertTitle>{error ? 'Unable to rank' : 'Loading'}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </AlertBody>
  </Alert>;
}
function RankingResults({ data }: { data: RankingResponse }) {
  const metadata = [
    ['Corpus version', data.corpusVersion], ['Preprocessing version', data.preprocessing.version],
    ['Scope', data.scope], ['Papers', data.paperCount], ['Total tokens', data.totalTokenCount],
    ['Distinct terms', data.distinctTermCount], ['Max frequency', data.maxFrequency],
    ['Radix base', data.parameters.radixBase], ['Bucket strategy', data.parameters.bucketStrategy],
    ['Bucket count', data.parameters.bucketCount], ['Bucket width', data.parameters.bucketWidth],
  ] as const;
  return <>
    <Card className="ranking-summary">
      <CardHeader><CardTitle>Run details</CardTitle></CardHeader>
      <CardContent>
        <dl className="ranking-metadata">{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="corpus-muted">NFC · Locale.ROOT lowercase · Unicode letter/mark/digit runs with a letter · No stopword removal or stemming · Manifest order · First-occurrence ties.</p>
      </CardContent>
    </Card>
    {data.results.map((result) => <Card key={result.method} className="ranking-result">
      <CardHeader>
        <CardTitle>{methodLabels[result.method]}</CardTitle>
        <p>Sort duration: <strong>{result.sortMilliseconds} ms</strong></p>
      </CardHeader>
      <CardContent>
        <table aria-label={`${methodLabels[result.method]} top terms`}>
          <caption>Top {result.topTerms.length} terms · Java order preserved</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Term</th><th scope="col">Frequency</th></tr></thead>
          <tbody>{result.topTerms.map((entry, index) => <tr key={entry.term}><td>{index + 1}</td><td>{entry.term}</td><td>{entry.frequency}</td></tr>)}</tbody>
        </table>
        {result.topTerms.length === 0 && <p>No terms were returned.</p>}
      </CardContent>
    </Card>)}
  </>;
}
