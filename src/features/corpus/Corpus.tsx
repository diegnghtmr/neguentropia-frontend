import { useEffect, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog, loadDetail } from './client';
import type { Availability, PaperCatalog, PaperDetail } from './schemas';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Alert, AlertBody, AlertTitle, AlertDescription } from './ui/alert';

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
const reasonLabels: Record<Exclude<Availability['blockedReason'], null>, string> = {
  NOT_IMPLEMENTED: 'Not implemented',
  CORPUS_UNAVAILABLE: 'Corpus unavailable',
  PROVIDER_UNAVAILABLE: 'Provider unavailable',
  TOKEN_COUNT_UNVERIFIED: 'Token count unverified',
  LENGTH_LIMIT_EXCEEDED: 'Length limit exceeded',
  PERMISSION_UNVERIFIED: 'Permission unverified',
  COST_PROTECTION_UNVERIFIED: 'Cost protection unverified',
  MODEL_CONFIGURATION_UNVERIFIED: 'Model configuration unverified',
};
function availabilityLabel(availability: Availability) {
  return availability.available ? 'Available' : `Unavailable — ${reasonLabels[availability.blockedReason]}`;
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
        <div className="corpus-catalog">
          <Badge variant="olive">Corpus ready · {catalog.data.papers.length} papers</Badge>
          <p className="corpus-version">Corpus version: <span>{catalog.data.corpusVersion}</span></p>
        </div>
        <div className="corpus-selection">
          <label htmlFor="paper-selection">Paper</label>
          <NativeSelect id="paper-selection" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} radius="soft" appearance="contour" className="w-full">
            <NativeSelectOption value="">Choose a paper</NativeSelectOption>
            {catalog.data.papers.map((paper) => <NativeSelectOption key={paper.id} value={paper.id}>{paper.title}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        {selectedId ? <PaperReader key={`${catalog.data.corpusVersion}:${selectedId}`} id={selectedId} corpusVersion={catalog.data.corpusVersion} /> : <p className="corpus-empty">Select a paper to read its original abstract.</p>}
        <section aria-labelledby="capabilities-heading" className="corpus-capabilities">
          <h3 id="capabilities-heading">Capabilities</h3>
          <p className="corpus-muted">Informative backend availability only; this screen does not run analyses or authorize text transfers.</p>
          <dl className="corpus-capability-list">
            {(['ranking', 'clustering', 'search'] as const).map((name) => <div key={name}><dt className="capitalize">{name}</dt><dd>{availabilityLabel(catalog.data.capabilities[name])}</dd></div>)}
            {catalog.data.capabilities.similarity.map(({ method, availability }) => <div key={method}><dt>{method}</dt><dd>{availabilityLabel(availability)}</dd></div>)}
          </dl>
        </section>
      </>}
    </section>
  );
}

function ReaderFeedback({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <Alert role={error ? 'alert' : 'status'} variant={error ? 'danger' : 'info'} presentation="note" className="corpus-feedback">
      <AlertBody className="col-span-full">
        <AlertTitle>{error ? 'Unable to load' : 'Loading'}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </AlertBody>
    </Alert>
  );
}

// Keyed by version + selection so the old detail cannot survive a selection change.
function PaperReader({ id, corpusVersion }: { id: string; corpusVersion: string }) {
  const [detail, setDetail] = useState<LoadState<PaperDetail>>({ state: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    loadDetail(id, corpusVersion, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDetail({ state: 'ready', data }); },
      (error: unknown) => { if (!controller.signal.aborted) setDetail({ state: 'error', message: errorMessage(error, 'abstract') }); },
    );
    return () => controller.abort();
  }, [id, corpusVersion]);
  if (detail.state === 'loading') return <ReaderFeedback message="Loading abstract…" />;
  if (detail.state === 'error') return <ReaderFeedback error message={detail.message} />;
  return (
    <article aria-labelledby="paper-title" className="corpus-paper">
      <Card>
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
        <CardFooter>
          <p className="corpus-hash">Abstract SHA-256: <span>{detail.data.abstractSha256}</span></p>
        </CardFooter>
      </Card>
    </article>
  );
}
