import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog } from '../corpus/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/shared/ui/table';
import { Checkbox, CheckboxBody, CheckboxGroup } from '@/shared/ui/checkbox';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription } from '@/shared/ui/field';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';
import { MotionPresence, MotionSurface } from '@/shared/ui/presence';
import { loadSimilarity } from './client';
import { apiErrorSchema, classicalMethods, similarityMethods, type SimilarityMethod, type SimilarityResponse, type SimilarityResult } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type CatalogState = { status: 'loading' } | { status: 'ready'; papers: Papers } | { status: 'error'; message: string };
type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: SimilarityResponse } | { status: 'error'; message: string };
const methodLabels: Record<SimilarityMethod, string> = { levenshtein: 'Levenshtein', lcs: 'LCS', 'tf-idf-cosine': 'TF-IDF cosine', jaccard: 'Jaccard', 'gemini-embeddings': 'Gemini embeddings', 'local-embeddings': 'Local embeddings' };
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'The backend returned an invalid response.';
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) return parsed.data.message;
  }
  return 'Could not complete the request. Check the backend connection and configuration.';
}

export function Similarity() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<SimilarityMethod[]>([...classicalMethods]);
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
      <h2 id="similarity-heading">Similarity</h2>
      <p className="corpus-muted">Compare abstracts using classical methods and embeddings.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog similarity-controls">
        <Field className="corpus-selection">
          <fieldset className="similarity-selection">
            <legend>Papers</legend>
            <FieldDescription>Select at least two papers. {selectedIds.length} selected.</FieldDescription>
            {catalog.status === 'loading' && <Feedback message="Loading papers" />}
            {catalog.status === 'error' && <Feedback error message={catalog.message} />}
            {catalog.status === 'ready' && <CheckboxGroup aria-label="Papers" className="similarity-papers">{catalog.papers.map((paper) =>
              <Checkbox key={paper.id} checked={selectedIds.includes(paper.id)} onCheckedChange={(checked) => {
                clearResult(); setSelectedIds((ids) => checked === true ? [...ids, paper.id] : ids.filter((id) => id !== paper.id));
              }}><CheckboxBody>{paper.title}</CheckboxBody></Checkbox>,
            )}</CheckboxGroup>}
          </fieldset>
        </Field>
        <Field className="corpus-selection">
          <fieldset className="similarity-selection">
            <legend>Methods</legend>
            <FieldDescription>Select at least one method.</FieldDescription>
            <CheckboxGroup aria-label="Methods">{similarityMethods.map((method) =>
              <Checkbox key={method} checked={selectedMethods.includes(method)} onCheckedChange={(checked) => {
                clearResult(); setSelectedMethods((methods) => checked === true ? [...methods, method] : methods.filter((item) => item !== method));
              }}><CheckboxBody>{methodLabels[method]}</CheckboxBody></Checkbox>,
            )}</CheckboxGroup>
          </fieldset>
        </Field>
        <Button type="button" disabled={catalog.status !== 'ready' || selectedIds.length < 2 || selectedMethods.length === 0 || state.status === 'loading'} loading={state.status === 'loading'} onClick={() => { void run(); }}>Run similarity</Button>
        <p>Classical scores range from 0 to 1. Embedding cosine ranges from -1 to 1. Higher scores indicate greater similarity, not a probability or a plagiarism percentage.</p>
        <p>Compute times are single Java measurements in milliseconds, not HTTP latency or benchmarks. TF-IDF is fitted on all 20 abstracts. Embedding vectors (Gemini and the local model) are generated once in advance. Embedding compute time measures only the Java cosine calculation.</p>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>No comparison has been run.</EmptyDescription></Empty>}
        {state.status === 'loading' && <Feedback message="Running similarity" />}
        {state.status === 'error' && <Feedback error message={state.message} />}
        {state.status === 'ready' && catalog.status === 'ready' && <SimilarityResults data={state.data} papers={catalog.papers} />}
      </div>
    </div>
  </section>;
}
function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) return <div className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></div>;
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>Unable to compare</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function Explanation({ result, data, left, right }: { result: SimilarityResult; data: SimilarityResponse; left: string; right: string }) {
  switch (result.method) {
    case 'levenshtein': return <><p>Distance: {result.distance}</p><p>Left code points: {result.leftCodePointLength}</p><p>Right code points: {result.rightCodePointLength}</p></>;
    case 'lcs': return <><p>Length: {result.length}</p><p>Left tokens: {result.leftTokenCount}</p><p>Right tokens: {result.rightTokenCount}</p><p>Subsequence: {result.subsequence.join(' ') || 'Empty'}</p></>;
    case 'tf-idf-cosine': return <><p>Dimension: {result.dimension}</p><p>Fit papers: {result.fitPaperCount}</p></>;
    case 'gemini-embeddings':
    case 'local-embeddings': {
      const run = data.embeddingRuns.find((item) => item.method === result.method)!;
      const leftPaper = run.papers.find((paper) => paper.paperId === left)!;
      const rightPaper = run.papers.find((paper) => paper.paperId === right)!;
      return <><p>Model: {run.configuration.modelId}</p><p>Dimension: {result.dimension}</p><p>Left input tokens: {leftPaper.inputTokenCount}</p><p>Right input tokens: {rightPaper.inputTokenCount}</p></>;
    }
    case 'jaccard': return <><p>Intersection: {result.intersectionSize}</p><p>Union: {result.unionSize}</p></>;
  }
}
function SimilarityResults({ data, papers }: { data: SimilarityResponse; papers: Papers }) {
  const title = (id: string) => papers.find((paper) => paper.id === id)!.title;
  return <div className="ranking-output">
    <p>Preprocessing: {data.preprocessing.version}</p>
    <MotionPresence>{data.pairs.map((pair) => {
      const label = `${title(pair.left)} vs ${title(pair.right)}`;
      return <MotionSurface key={JSON.stringify([pair.left, pair.right])} preset="soften" exitDuration={0}>
        <Card className="similarity-result">
          <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
          <CardContent><TableContainer><Table aria-label={label}>
            <TableCaption>Similarity results</TableCaption>
            <TableHeader><TableRow><TableHead>Method</TableHead><TableHead numeric>Score</TableHead><TableHead>Explanation</TableHead><TableHead numeric>Compute time (ms)</TableHead></TableRow></TableHeader>
            <TableBody>{pair.results.map((result) => <TableRow key={result.method}>
              <TableCell>{methodLabels[result.method]}</TableCell><TableCell numeric>{result.score.toFixed(4)}</TableCell>
              <TableCell><Explanation result={result} data={data} left={pair.left} right={pair.right} /></TableCell><TableCell numeric>{result.method === 'gemini-embeddings' || result.method === 'local-embeddings' ? result.cosineMilliseconds : result.computeMilliseconds}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer></CardContent>
        </Card>
      </MotionSurface>;
    })}</MotionPresence>
  </div>;
}
