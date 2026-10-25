import { useEffect, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog, loadDetail } from './client';
import type { PaperCatalog, PaperDetail } from './schemas';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/ui/card';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Field, FieldLabel } from '@/shared/ui/field';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';

type LoadState<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error'; message: string };
const errorCode = z.object({ code: z.string() });
function errorMessage(error: unknown, subject: 'corpus' | 'abstract') {
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = errorCode.safeParse(error.response?.data);
    if (parsed.success && parsed.data.code === 'CORPUS_UNAVAILABLE') {
      return 'Corpus is unavailable. No article data can be shown.';
    }
    if (parsed.success && parsed.data.code === 'PAPER_NOT_FOUND') {
      return 'Paper was not found. Reload the page to refresh the catalog.';
    }
  }
  return `Could not load ${subject}. Check the backend connection and configuration, then reload the page.`;
}
export function Corpus() {
  const [catalog, setCatalog] = useState<LoadState<PaperCatalog>>({ state: 'loading' });
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setCatalog({ state: 'ready', data }); },
      (error: unknown) => { if (!controller.signal.aborted) setCatalog({ state: 'error', message: errorMessage(error, 'corpus') }); },
    );
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="corpus-heading" className="corpus" data-motion="off">
      <div className="corpus-intro">
        <h2 id="corpus-heading">Corpus</h2>
        <p className="corpus-muted">Local corpus reader</p>
      </div>
      {catalog.state === 'loading' && <ReaderFeedback message="Loading corpus…" />}
      {catalog.state === 'error' && <ReaderFeedback error message={catalog.message} />}
      {catalog.state === 'ready' && <>
        <div className="corpus-layout">
          <Card variant="blue" className="corpus-catalog">
            <Badge variant="olive">Corpus ready · {catalog.data.papers.length} papers</Badge>
            <Field controlId="paper-selection" className="corpus-selection">
              <FieldLabel>Paper</FieldLabel>
              <Select value={selectedId} onValueChange={setSelectedId} containerProps={{ className: 'block w-full min-w-0' }}>
                <SelectTrigger id="paper-selection" radius="soft" appearance="contour" className="-block">
                  <span><SelectValue placeholder="Choose a paper" /></span>
                </SelectTrigger>
                <SelectContent style={{ '--menu-width': 'min(40rem, calc(100vw - 24px))' } as CSSProperties}>
                  {catalog.data.papers.map((paper) => <SelectItem key={paper.id} value={paper.id}>{paper.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </Card>
          <div className="corpus-reading">
            {selectedId ? <PaperReader key={selectedId} id={selectedId} /> : <Empty><EmptyDescription>Select a paper to read its original abstract.</EmptyDescription></Empty>}
          </div>
        </div>
      </>}
    </section>
  );
}

function ReaderFeedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) {
    return <div className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></div>;
  }
  return (
    <Alert role="alert" variant="danger" presentation="note" className="corpus-feedback">
      <AlertBody className="col-span-full">
        <AlertTitle>Unable to load</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </AlertBody>
    </Alert>
  );
}

// Keyed by selection so the old detail cannot survive a selection change.
function PaperReader({ id }: { id: string }) {
  const [detail, setDetail] = useState<LoadState<PaperDetail>>({ state: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    loadDetail(id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDetail({ state: 'ready', data }); },
      (error: unknown) => { if (!controller.signal.aborted) setDetail({ state: 'error', message: errorMessage(error, 'abstract') }); },
    );
    return () => controller.abort();
  }, [id]);
  if (detail.state === 'loading') return <ReaderFeedback message="Loading abstract…" />;
  if (detail.state === 'error') return <ReaderFeedback error message={detail.message} />;
  return (
    <article aria-labelledby="paper-title" className="corpus-paper">
      <Card className="corpus-reading-card">
        <CardHeader>
          <div className="corpus-paper-heading">
            <CardTitle id="paper-title">{detail.data.title}</CardTitle>
            <CardDescription>{detail.data.authors.join(', ')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <h4>Original abstract</h4>
          <p data-testid="original-abstract" className="corpus-abstract">{detail.data.originalAbstract}</p>
        </CardContent>
      </Card>
    </article>
  );
}
