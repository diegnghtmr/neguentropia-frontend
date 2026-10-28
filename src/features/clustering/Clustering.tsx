import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog } from '../corpus/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';
import { MotionSurface } from '@/shared/ui/presence';
import { loadClustering } from './client';
import { Dendrogram } from './Dendrogram';
import { apiErrorSchema, type ClusteringMethod, type ClusteringResponse, type ClusteringResult } from './schemas';

type Papers = Awaited<ReturnType<typeof loadCatalog>>['papers'];
type State = { status: 'idle' | 'loading' } | { status: 'ready'; data: ClusteringResponse } | { status: 'error'; message: string };
const methodLabels: Record<ClusteringMethod, string> = { 'single-linkage': 'Single linkage', 'complete-linkage': 'Complete linkage', 'average-linkage': 'Average linkage' };
const counts = Array.from({ length: 18 }, (_, i) => String(i + 2));
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return 'The backend returned an invalid clustering response.';
  }
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return `${parsed.data.code}: ${parsed.data.message}`;
    }
  }
  return 'Could not run clustering. Check the backend connection and configuration.';
}

export function Clustering() {
  const [papers, setPapers] = useState<Papers>([]);
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
      () => undefined,
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
      <h2 id="clustering-heading">Clustering</h2>
      <p className="corpus-muted">Three hierarchical linkage criteria over the same TF-IDF cosine distances.</p>
    </div>
    <div className="corpus-layout">
      <Card variant="blue" className="corpus-catalog">
        <Field controlId="cluster-count" className="corpus-selection">
          <FieldLabel>Number of clusters</FieldLabel>
          <Select value={count} onValueChange={changeCount} containerProps={{ className: 'block w-full min-w-0' }}>
            <SelectTrigger id="cluster-count" aria-describedby="cluster-count-description" radius="soft" appearance="contour" className="-block">
              <span><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              {counts.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldDescription id="cluster-count-description">The tree is cut into this many groups, from 2 to 19.</FieldDescription>
        </Field>
        <Button type="button" disabled={state.status === 'loading'} loading={state.status === 'loading'} onClick={() => { void run(); }}>Run clustering</Button>
        <p>Silhouette ranges from -1 to 1. A higher value means more coherent groups for the chosen cut.</p>
      </Card>
      <div className="ranking-output" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <Empty><EmptyDescription>No clustering has been run.</EmptyDescription></Empty>}
        {state.status === 'loading' && <Feedback message="Running clustering" />}
        {state.status === 'error' && <Feedback error message={state.message} />}
        {state.status === 'ready' && <ClusteringResults data={state.data} papers={papers} />}
      </div>
    </div>
  </section>;
}
function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) {
    return <div className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></div>;
  }
  return <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>Unable to cluster</AlertTitle><AlertDescription>{message}</AlertDescription></AlertBody></Alert>;
}
function mostCoherent(results: readonly ClusteringResult[]) {
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
  const best = mostCoherent(data.results);
  const bestNames = best.map((method) => methodLabels[method]).join(' and ');
  const nodeName = (id: number) => {
    if (id < data.leaves.length) {
      return titleOf(data.leaves[id]!.paperId);
    }
    return `Merge ${id}`;
  };
  return <div className="ranking-output">
    {best.length === 0
      ? <p role="status">Silhouette values are tied, so no method is more coherent.</p>
      : <p role="status">{`Most coherent: ${bestNames}`}</p>}
    {data.results.map((result, index) => <MotionSurface key={result.method} preset="soften" delay={0.07 * index} exitDuration={0}>
      <Card className="ranking-result">
        <CardHeader>
          <CardTitle>{methodLabels[result.method]}</CardTitle>
          {best.includes(result.method) && <Badge>Most coherent</Badge>}
        </CardHeader>
        <CardContent>
          <p>{`Silhouette ${result.silhouette.toFixed(4)}`}</p>
          <div>
            <Dendrogram name={methodLabels[result.method]} merges={result.merges} leafLabels={leafLabels} leafTitles={leafTitles} />
          </div>
          <h4>Groups</h4>
          <ul aria-label={`${methodLabels[result.method]} groups`}>
            {result.partition.map((group, i) => <li key={i}>{`Group ${i + 1}: ${group.paperIds.map(titleOf).join(', ')}`}</li>)}
          </ul>
          <details>
            <summary>Merge heights</summary>
            <ol>
              {result.merges.map((merge) => <li key={merge.id}>{`Merge ${merge.id}: ${nodeName(merge.leftId)} and ${nodeName(merge.rightId)} at height ${merge.height.toFixed(4)}`}</li>)}
            </ol>
          </details>
        </CardContent>
      </Card>
    </MotionSurface>)}
  </div>;
}
