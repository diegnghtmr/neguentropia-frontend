import { useEffect, useState, type CSSProperties } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog, loadDetail } from './client';
import type { PaperCatalog, PaperDetail } from './schemas';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/ui/card';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Field, FieldLabel } from '@/shared/ui/field';
import { Empty, EmptyDescription } from '@/shared/ui/empty';
import { Spinner, SpinnerLabel } from '@/shared/ui/spinner';
import { MotionPresence, MotionSurface } from '@/shared/ui/presence';

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
        <p className="corpus-muted">Original abstracts of the 20 papers.</p>
      </div>
      {catalog.state === 'loading' && <ReaderFeedback message="Loading corpus…" />}
      {catalog.state === 'error' && <ReaderFeedback error message={catalog.message} />}
      {catalog.state === 'ready' && <>
        <div className="corpus-layout">
          <Card variant="blue" className="corpus-catalog">
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
            <MotionPresence mode="wait">
              {selectedId
                ? <PaperReader key={selectedId} id={selectedId} />
                : <MotionSurface key="empty" preset="soften" exitDuration={0.2}><Empty><EmptyDescription>Select a paper to read its original abstract.</EmptyDescription></Empty></MotionSurface>}
            </MotionPresence>
          </div>
        </div>
      </>}
    </section>
  );
}

function ReaderFeedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!error) {
    return <MotionSurface preset="fade" className="corpus-feedback"><Spinner label={message} /><SpinnerLabel aria-hidden="true">{message}</SpinnerLabel></MotionSurface>;
  }
  return (
    <MotionSurface preset="soften" exitDuration={0.2}>
      <Alert role="alert" variant="danger" presentation="note" className="corpus-feedback">
        <AlertBody className="col-span-full">
          <AlertTitle>Unable to load</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </AlertBody>
      </Alert>
    </MotionSurface>
  );
}

// Keyed by selection so the old detail cannot survive a selection change.
function PaperReader({ id }: { id: string }) {
  const [detail, setDetail] = useState<LoadState<PaperDetail>>({ state: 'loading' });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 300);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadDetail(id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDetail({ state: 'ready', data }); },
      (error: unknown) => { if (!controller.signal.aborted) setDetail({ state: 'error', message: errorMessage(error, 'abstract') }); },
    );
    return () => controller.abort();
  }, [id]);
  return (
    <MotionSurface preset="fade" exitDuration={0.2}>
      <MotionPresence mode="wait">
        {detail.state === 'loading' && slow && <ReaderFeedback key="loading" message="Loading abstract…" />}
        {detail.state === 'error' && <ReaderFeedback key="error" error message={detail.message} />}
        {detail.state === 'ready' && <MotionSurface key="ready" preset="soften" exitDuration={0.2}><PaperArticle detail={detail.data} /></MotionSurface>}
      </MotionPresence>
    </MotionSurface>
  );
}

function PaperArticle({ detail }: { detail: PaperDetail }) {
  return (
    <article aria-labelledby="paper-title" className="corpus-paper">
      <Card className="corpus-reading-card">
        <CardHeader>
          <div className="corpus-paper-heading">
            <CardTitle id="paper-title">{detail.title}</CardTitle>
            <CardDescription>{detail.authors.join(', ')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <h4>Original abstract</h4>
          <p data-testid="original-abstract" className="corpus-abstract">{detail.originalAbstract}</p>
        </CardContent>
      </Card>
    </article>
  );
}
