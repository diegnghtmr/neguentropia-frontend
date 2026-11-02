import { useEffect, useRef, useState } from 'react';
import { Alert, AlertBody, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton, SkeletonGroup } from '@/shared/ui/skeleton';
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { loadSearchSteps } from './client';
import { errorMessage } from './errors';
import { highlightSegments } from './highlight';
import type { SearchSteps } from './schemas';

type State = { status: 'idle' | 'loading' } | { status: 'ready'; steps: SearchSteps } | { status: 'error'; message: string };
type Method = 'kmp' | 'boyer-moore' | 'rabin-karp';
const stepsFallback = 'No se pudieron cargar los pasos. Revisa la conexión y la configuración del backend.';

function visible(text: string) {
  return text.split(' ').join('␣');
}
function yesNo(value: boolean) {
  if (value) {
    return 'sí';
  }
  return 'no';
}
function verification(equalHash: boolean, match: boolean) {
  if (match) {
    return 'coincidencia';
  }
  if (equalHash) {
    return 'colisión';
  }
  return '';
}

export function SearchStepsPanel({ pattern, paperId }: { pattern: string; paperId: string }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function load() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading' });
    try {
      const steps = await loadSearchSteps({ pattern, paperId }, controller.signal);
      if (!controller.signal.aborted) {
        setState({ status: 'ready', steps });
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        setState({ status: 'error', message: errorMessage(error, stepsFallback) });
      }
    }
  }
  function hide() {
    active.current?.abort();
    active.current = null;
    setState({ status: 'idle' });
  }
  return <div className="search-steps">
    {state.status === 'ready' && <Button type="button" variant="outline" size="sm" onClick={hide}>Ocultar pasos</Button>}
    {(state.status === 'idle' || state.status === 'error') && <Button type="button" variant="outline" size="sm" onClick={() => void load()}>Ver paso a paso</Button>}
    {state.status === 'loading' && <StepsSkeleton />}
    {state.status === 'error' && <Alert role="alert" variant="danger" presentation="note"><AlertBody className="col-span-full"><AlertTitle>No se pudieron cargar los pasos</AlertTitle><AlertDescription>{state.message}</AlertDescription></AlertBody></Alert>}
    {state.status === 'ready' && <StepsView steps={state.steps} />}
  </div>;
}
function StepsSkeleton() {
  return <SkeletonGroup role="status" aria-label="Cargando pasos" aria-busy="true" className="skeleton-view">
    <Skeleton variant="line" style={{ width: '70%' }} />
    {[100, 90, 95, 60].map((width, row) => <Skeleton key={row} variant="line" style={{ width: `${width}%` }} />)}
  </SkeletonGroup>;
}
function StepsView({ steps }: { steps: SearchSteps }) {
  const [method, setMethod] = useState<Method>('kmp');
  return <div className="search-steps-body">
    <Fragment steps={steps} />
    <Tabs value={method} onValueChange={(value) => setMethod(value as Method)}>
      <TabsList aria-label="Algoritmo">
        <TabsTrigger value="kmp">KMP</TabsTrigger>
        <TabsTrigger value="boyer-moore">Boyer-Moore</TabsTrigger>
        <TabsTrigger value="rabin-karp">Rabin-Karp</TabsTrigger>
      </TabsList>
      <TabsContent value="kmp" forceMount hidden={method !== 'kmp'}><KmpView steps={steps} /></TabsContent>
      <TabsContent value="boyer-moore" forceMount hidden={method !== 'boyer-moore'}><BoyerMooreView steps={steps} /></TabsContent>
      <TabsContent value="rabin-karp" forceMount hidden={method !== 'rabin-karp'}><RabinKarpView steps={steps} /></TabsContent>
    </Tabs>
  </div>;
}
function Fragment({ steps }: { steps: SearchSteps }) {
  const start = `El fragmento empieza en la posición ${steps.fragmentStart} del abstract.`;
  let summary = `${start} Sin coincidencias en el fragmento.`;
  if (steps.positions.length > 0) {
    const inFragment = steps.positions.join(', ');
    const inAbstract = steps.positions.map((position) => steps.fragmentStart + position).join(', ');
    const label = steps.positions.length === 1 ? 'Coincidencia en la posición' : 'Coincidencias en las posiciones';
    summary = `${start} ${label} ${inFragment} del fragmento (${inAbstract} en el abstract).`;
  }
  return <div className="search-step-section">
    <h4>Fragmento</h4>
    <p className="corpus-muted">{summary}</p>
    <p className="corpus-abstract search-fragment">{highlightSegments(steps.fragment, steps.positions, steps.pattern.length).map((segment, i) => {
      if (segment.match) {
        return <mark key={i}>{segment.text}</mark>;
      }
      return segment.text;
    })}</p>
  </div>;
}
function KmpView({ steps }: { steps: SearchSteps }) {
  const { pattern, kmp } = steps;
  return <div className="search-step-section">
    <h4>Tabla failure</h4>
    <TableContainer>
      <Table aria-label="Tabla failure de KMP">
        <TableHeader><TableRow><TableHead numeric>i</TableHead><TableHead>patrón[0..i]</TableHead><TableHead>Prefijo que también es sufijo</TableHead><TableHead numeric>failure[i]</TableHead></TableRow></TableHeader>
        <TableBody>{kmp.failure.map((value, i) => {
          let prefix = 'ninguno';
          if (value > 0) {
            prefix = visible(pattern.slice(0, value));
          }
          return <TableRow key={i}>
            <TableCell numeric>{i}</TableCell>
            <TableCell>{visible(pattern.slice(0, i + 1))}</TableCell>
            <TableCell>{prefix}</TableCell>
            <TableCell numeric>{value}</TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
    <h4>Recorrido</h4>
    <TableContainer className="search-steps-scroll" tabIndex={0} aria-label="Recorrido de KMP desplazable">
      <Table aria-label="Recorrido de KMP">
        <TableHeader><TableRow><TableHead numeric>i</TableHead><TableHead>Texto[i]</TableHead><TableHead numeric>matched antes</TableHead><TableHead>Retrocesos</TableHead><TableHead numeric>matched después</TableHead><TableHead>Nota</TableHead></TableRow></TableHeader>
        <TableBody>{kmp.steps.map((step) => {
          let note = '';
          let retreats = 'ninguno';
          if (step.fallbacks.length > 0) {
            retreats = [step.matchedBefore, ...step.fallbacks].join(' → ');
          }
          if (step.match) {
            note = `coincidencia en ${step.index - pattern.length + 1}; continúa con m=${step.matchedAfter}`;
          }
          return <TableRow key={step.index}>
            <TableCell numeric>{step.index}</TableCell>
            <TableCell>{visible(step.character)}</TableCell>
            <TableCell numeric>{step.matchedBefore}</TableCell>
            <TableCell>{retreats}</TableCell>
            <TableCell numeric>{step.matchedAfter}</TableCell>
            <TableCell>{note}</TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
  </div>;
}
function alignment(steps: SearchSteps, start: number, mismatchIndex: number, match: boolean) {
  const { fragment, pattern } = steps;
  let marker = `${' '.repeat(start + mismatchIndex)}^`;
  if (match) {
    marker = `${' '.repeat(start)}${'^'.repeat(pattern.length)}`;
  }
  return [`texto  : ${fragment}`, `patrón : ${' '.repeat(start)}${pattern}`, `marca  : ${marker}`].join('\n');
}
function BoyerMooreView({ steps }: { steps: SearchSteps }) {
  const { pattern, boyerMoore } = steps;
  return <div className="search-step-section">
    <h4>Última aparición de cada carácter</h4>
    <TableContainer>
      <Table aria-label="Última aparición de cada carácter">
        <TableHeader><TableRow><TableHead>Carácter</TableHead><TableHead numeric>Última aparición</TableHead></TableRow></TableHeader>
        <TableBody>
          {boyerMoore.lastOccurrences.map((entry) => <TableRow key={entry.character}>
            <TableCell>{visible(entry.character)}</TableCell>
            <TableCell numeric>{entry.index}</TableCell>
          </TableRow>)}
          <TableRow><TableCell>cualquier otro</TableCell><TableCell numeric>-1</TableCell></TableRow>
        </TableBody>
      </Table>
    </TableContainer>
    <h4>Alineaciones</h4>
    {boyerMoore.steps.map((step) => {
      let sentence = `s=${step.start}: coincidencia completa tras ${pattern.length} comparaciones correctas; avanza 1.`;
      if (!step.match) {
        const correct = pattern.length - 1 - step.mismatchIndex;
        const character = visible(step.textCharacter);
        const expected = visible(pattern.charAt(step.mismatchIndex));
        sentence = `s=${step.start}: ${correct} ${correct === 1 ? 'comparación correcta' : 'comparaciones correctas'} desde la derecha; falla en j=${step.mismatchIndex} (texto ${character} ≠ patrón ${expected}); última(${character})=${step.lastIndex}; desplazamiento = max(1, ${step.mismatchIndex} − ${step.lastIndex}) = ${step.shift}.`;
      }
      return <div key={step.start} className="search-step">
        <p>{sentence}</p>
        <pre className="search-alignment" tabIndex={0}>{alignment(steps, step.start, step.mismatchIndex, step.match)}</pre>
      </div>;
    })}
  </div>;
}
function RabinKarpView({ steps }: { steps: SearchSteps }) {
  const { rabinKarp } = steps;
  return <div className="search-step-section">
    <ul className="search-constants">
      <li>{`Base: ${rabinKarp.base}`}</li>
      <li>{`Módulo: ${rabinKarp.modulus}`}</li>
      <li>{`Hash del patrón: ${rabinKarp.patternHash}`}</li>
      <li>{`high: ${rabinKarp.high}`}</li>
    </ul>
    <TableContainer className="search-steps-scroll" tabIndex={0} aria-label="Ventanas de Rabin-Karp desplazable">
      <Table aria-label="Ventanas de Rabin-Karp">
        <TableHeader><TableRow><TableHead numeric>s</TableHead><TableHead>Ventana</TableHead><TableHead numeric>Hash</TableHead><TableHead>¿= hash patrón?</TableHead><TableHead>Verificación</TableHead></TableRow></TableHeader>
        <TableBody>{rabinKarp.windows.map((window) => <TableRow key={window.start}>
          <TableCell numeric>{window.start}</TableCell>
          <TableCell>{visible(window.text)}</TableCell>
          <TableCell numeric>{window.hash}</TableCell>
          <TableCell>{yesNo(window.equalHash)}</TableCell>
          <TableCell>{verification(window.equalHash, window.match)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  </div>;
}
