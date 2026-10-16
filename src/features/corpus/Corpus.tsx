import { useEffect, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loadCatalog, loadDetail } from './client';
import type { Availability, PaperCatalog, PaperDetail } from './schemas';

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
    <section aria-labelledby="corpus-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Local corpus reader</p>
      <h2 id="corpus-heading" className="mt-3 text-2xl font-semibold">Corpus</h2>
      {catalog.state === 'loading' && <p role="status" className="mt-6">Loading corpus…</p>}
      {catalog.state === 'error' && <p role="alert" className="mt-6 text-red-800">{catalog.message}</p>}
      {catalog.state === 'ready' && <>
        <p className="mt-4">Corpus ready · {catalog.data.papers.length} papers</p>
        <p className="mt-1 break-words text-sm text-slate-600">Corpus version: <span>{catalog.data.corpusVersion}</span></p>
        <label htmlFor="paper-selection" className="mt-6 block font-medium">Paper</label>
        <select id="paper-selection" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-slate-400 bg-white p-3">
          <option value="">Choose a paper</option>
          {catalog.data.papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}
        </select>
        {selectedId ? <PaperReader key={`${catalog.data.corpusVersion}:${selectedId}`} id={selectedId} corpusVersion={catalog.data.corpusVersion} /> : <p className="mt-4 text-slate-600">Select a paper to read its original abstract.</p>}
        <section aria-labelledby="capabilities-heading" className="mt-8 border-t border-slate-200 pt-6">
          <h3 id="capabilities-heading" className="text-lg font-semibold">Capabilities</h3>
          <p className="mt-2 text-sm text-slate-600">Informative backend availability only; this screen does not run analyses or authorize text transfers.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {(['ranking', 'clustering', 'search'] as const).map((name) => <div key={name}><dt className="font-medium capitalize">{name}</dt><dd className="text-sm text-slate-600">{availabilityLabel(catalog.data.capabilities[name])}</dd></div>)}
            {catalog.data.capabilities.similarity.map(({ method, availability }) => <div key={method}><dt className="font-medium">{method}</dt><dd className="text-sm text-slate-600">{availabilityLabel(availability)}</dd></div>)}
          </dl>
        </section>
      </>}
    </section>
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
  if (detail.state === 'loading') return <p role="status" className="mt-6">Loading abstract…</p>;
  if (detail.state === 'error') return <p role="alert" className="mt-6 text-red-800">{detail.message}</p>;
  return (
    <article aria-labelledby="paper-title" className="mt-6 min-w-0">
      <h3 id="paper-title" className="text-xl font-semibold">{detail.data.title}</h3>
      <p className="mt-2 text-slate-600">{detail.data.authors.join(', ')}</p>
      <h4 className="mt-5 font-semibold">Original abstract</h4>
      <p data-testid="original-abstract" className="mt-2 whitespace-pre-wrap break-words leading-7">{detail.data.originalAbstract}</p>
      <p className="mt-4 break-all text-xs text-slate-600">Abstract SHA-256: <span>{detail.data.abstractSha256}</span></p>
    </article>
  );
}
