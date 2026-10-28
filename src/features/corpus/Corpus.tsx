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
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { MotionPresence, MotionSurface } from '@/shared/ui/presence';

type LoadState<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error'; message: string };
const errorCode = z.object({ code: z.string() });
function errorMessage(error: unknown, subject: 'el corpus' | 'el abstract') {
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = errorCode.safeParse(error.response?.data);
    if (parsed.success && parsed.data.code === 'CORPUS_UNAVAILABLE') {
      return 'El corpus no está disponible. No se pueden mostrar artículos.';
    }
    if (parsed.success && parsed.data.code === 'PAPER_NOT_FOUND') {
      return 'No se encontró el artículo. Recarga la página para actualizar el catálogo.';
    }
    if (parsed.success && parsed.data.code === 'INTERNAL_ERROR') {
      return 'El servidor tuvo un error al leer el corpus. Inténtalo de nuevo más tarde.';
    }
  }
  return `No se pudo cargar ${subject}. Revisa la conexión y la configuración del backend, y recarga la página.`;
}
export function Corpus() {
  const [catalog, setCatalog] = useState<LoadState<PaperCatalog>>({ state: 'loading' });
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setCatalog({ state: 'ready', data }); },
      (error: unknown) => { if (!controller.signal.aborted) setCatalog({ state: 'error', message: errorMessage(error, 'el corpus') }); },
    );
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="corpus-heading" className="corpus" data-motion="off">
      <div className="corpus-intro">
        <h2 id="corpus-heading">Corpus</h2>
        <p className="corpus-muted">Abstracts de los 20 artículos.</p>
      </div>
      {catalog.state === 'loading' && <MotionSurface preset="fade"><CatalogSkeleton /></MotionSurface>}
      {catalog.state === 'error' && <ReaderFeedback message={catalog.message} />}
      {catalog.state === 'ready' && <>
        <div className="corpus-layout">
          <Card variant="blue" className="corpus-catalog">
            <Field controlId="paper-selection" className="corpus-selection">
              <FieldLabel>Artículo</FieldLabel>
              <Select value={selectedId} onValueChange={setSelectedId} containerProps={{ className: 'block w-full min-w-0' }}>
                <SelectTrigger id="paper-selection" radius="soft" appearance="contour" className="-block">
                  <span><SelectValue placeholder="Elige un artículo" /></span>
                </SelectTrigger>
                <SelectContent style={{ '--menu-width': 'min(40rem, calc(100vw - 24px))' } as CSSProperties}>
                  {catalog.data.papers.map((paper) => <SelectItem key={paper.id} value={paper.id} adornment="none">{paper.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </Card>
          <div className="corpus-reading">
            <MotionPresence mode="wait">
              {selectedId
                ? <PaperReader key={selectedId} id={selectedId} />
                : <MotionSurface key="empty" preset="soften" exitDuration={0.2}><Empty><EmptyDescription>Elige un artículo para leer su abstract.</EmptyDescription></Empty></MotionSurface>}
            </MotionPresence>
          </div>
        </div>
      </>}
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <SkeletonGroup role="status" aria-label="Cargando el corpus" aria-busy="true">
      <Skeleton variant="pill" style={{ height: 'var(--s-10)', width: '100%' }} />
    </SkeletonGroup>
  );
}

function PaperSkeleton() {
  const widths = ['100%', '96%', '100%', '88%', '98%', '92%', '100%', '58%'];
  return (
    <SkeletonGroup role="status" aria-label="Cargando el abstract" aria-busy="true" className="skeleton-view">
      <Skeleton variant="line" style={{ height: 'var(--s-6)', width: '78%' }} />
      <Skeleton variant="line" style={{ width: '42%' }} />
      <SkeletonGroup>
        {widths.map((width, index) => <Skeleton key={index} variant="line" style={{ width }} />)}
      </SkeletonGroup>
    </SkeletonGroup>
  );
}

function ReaderFeedback({ message }: { message: string }) {
  return (
    <MotionSurface preset="soften" exitDuration={0.2}>
      <Alert role="alert" variant="danger" presentation="note" className="corpus-feedback">
        <AlertBody className="col-span-full">
          <AlertTitle>No se pudo cargar</AlertTitle>
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
      (error: unknown) => { if (!controller.signal.aborted) setDetail({ state: 'error', message: errorMessage(error, 'el abstract') }); },
    );
    return () => controller.abort();
  }, [id]);
  return (
    <MotionSurface preset="fade" exitDuration={0.2}>
      <MotionPresence mode="wait">
        {detail.state === 'loading' && slow && <MotionSurface key="loading" preset="fade"><PaperSkeleton /></MotionSurface>}
        {detail.state === 'error' && <ReaderFeedback key="error" message={detail.message} />}
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
          <h4>Abstract</h4>
          <p data-testid="original-abstract" className="corpus-abstract">{detail.originalAbstract}</p>
        </CardContent>
      </Card>
    </article>
  );
}
