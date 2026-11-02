import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetPapers } from '../corpus/client';
import { http } from '../../infrastructure/api/http';
import { Similarity } from './Similarity';
import { loadSimilaritySteps } from './client';
import { stepsSchema } from './schemas';
import { catalogFixture, matrixFixture, similarityFixture, stepsFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
let post: ReturnType<typeof vi.fn<AxiosAdapter>>;
let similarity: unknown;
beforeEach(() => {
  similarity = similarityFixture();
  post = vi.fn<AxiosAdapter>(async (config) => ({
    data: config.url === '/similarity/steps' ? stepsFixture() : similarity, status: 200, statusText: 'OK', headers: {}, config,
  }));
  http.defaults.adapter = async (config) => config.method === 'get'
    ? { data: catalogFixture(), status: 200, statusText: 'OK', headers: {}, config }
    : post(config);
});
afterEach(() => {
  forgetPapers();
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
async function compare(...numbers: number[]) {
  render(<Similarity />);
  fireEvent.click(await screen.findByRole('button', { name: 'Artículos' }));
  const search = await screen.findByRole('searchbox');
  for (const n of numbers) fireEvent.click(screen.getByRole('checkbox', { name: `paper-${n} Paper ${n}` }));
  fireEvent.keyDown(search, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Calcular similitud' }));
  await screen.findByRole('table', { name: 'Paper 1 vs Paper 2' });
}

describe('steps boundary', () => {
  it('posts the pair to the steps endpoint and parses the contract shape', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({ data: stepsFixture(), status: 200, statusText: 'OK', headers: {}, config }));
    http.defaults.adapter = adapter;
    const signal = new AbortController().signal;
    expect(await loadSimilaritySteps({ leftId: 'paper-1', rightId: 'paper-2' }, signal)).toEqual(stepsFixture());
    expect(adapter.mock.calls[0]![0]).toMatchObject({ url: '/similarity/steps', method: 'post', data: JSON.stringify({ leftId: 'paper-1', rightId: 'paper-2' }), signal });
  });
  it.each([
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, extra: 1 }),
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, levenshtein: { ...f.levenshtein, leftPrefix: 'abcdefghi' } }),
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, lcs: { ...f.lcs, leftTokens: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] } }),
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, tfIdf: { ...f.tfIdf, terms: Array.from({ length: 9 }, () => f.tfIdf.terms[0]!) } }),
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, tfIdf: { ...f.tfIdf, terms: [{ ...f.tfIdf.terms[0]!, documentFrequency: 21 }] } }),
    (f: ReturnType<typeof stepsFixture>) => ({ ...f, lcs: { ...f.lcs, cells: [[-1]] } }),
  ])('rejects incompatible steps %#', (change) => {
    expect(stepsSchema.safeParse(change(stepsFixture())).success).toBe(false);
  });
});

describe('similarity matrix', () => {
  beforeEach(() => { similarity = matrixFixture(); });
  it('shows an N×N table with ids as headers, four-decimal scores and empty labeled diagonal', async () => {
    await compare(1, 2, 3);
    const card = screen.getByRole('heading', { name: 'Matriz de similitud' }).closest('[data-slot="card"]') as HTMLElement;
    const table = within(card).getByRole('table', { name: 'Matriz de similitud: Levenshtein' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Artículo', 'paper-1', 'paper-2', 'paper-3']);
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('paper-1');
    expect(within(rows[1]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['', '0.5000', '0.1000']);
    expect(within(rows[2]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0.5000', '', '0.1500']);
    expect(within(rows[3]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0.1000', '0.1500', '']);
    expect(within(table).getAllByLabelText('Mismo artículo, sin puntaje')).toHaveLength(3);
  });
  it('switches the table to the chosen requested method', async () => {
    await compare(1, 2, 3);
    const select = screen.getByRole('combobox', { name: 'Método de la matriz' });
    expect(select).toHaveTextContent('Levenshtein');
    fireEvent.keyDown(select, { key: 'ArrowDown' });
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Levenshtein', 'LCS', 'Coseno TF-IDF', 'Jaccard']);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Jaccard' }), { key: 'Enter' });
    expect(await screen.findByRole('combobox', { name: 'Método de la matriz' })).toHaveTextContent('Jaccard');
    const table = screen.getByRole('table', { name: 'Matriz de similitud: Jaccard' });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('0.80000.4000');
    expect(within(table).getAllByRole('row')[3]).toHaveTextContent('0.40000.4500');
  });
});

describe('step by step', () => {
  async function open() {
    await compare(1, 2);
    const card = screen.getByRole('table', { name: 'Paper 1 vs Paper 2' }).closest('[data-slot="card"]') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    return card;
  }
  it('requests the pair and shows a text-free skeleton while loading', async () => {
    let resolve!: (value: Awaited<ReturnType<AxiosAdapter>>) => void;
    post.mockImplementation((config) => config.url === '/similarity/steps'
      ? new Promise((done) => { resolve = done; })
      : Promise.resolve({ data: similarity, status: 200, statusText: 'OK', headers: {}, config }));
    const card = await open();
    const loading = await within(card).findByRole('status', { name: 'Cargando los pasos' });
    expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
    expect(loading.textContent).toBe('');
    const call = post.mock.calls.find(([config]) => config.url === '/similarity/steps')![0];
    expect(JSON.parse(call.data as string)).toEqual({ leftId: 'paper-1', rightId: 'paper-2' });
    await act(async () => { resolve({ data: stepsFixture(), status: 200, statusText: 'OK', headers: {}, config: call }); });
    expect(within(card).queryByRole('status', { name: 'Cargando los pasos' })).not.toBeInTheDocument();
  });
  it('shows the Levenshtein corner with visible spaces, D[m][n] and the score formula', async () => {
    const card = await open();
    const table = await within(card).findByRole('table', { name: 'Esquina de la matriz de Levenshtein' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[0]!).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fila', '∅', 'a', 'b']);
    expect(rows.map((r) => within(r).queryByRole('rowheader')?.textContent ?? null)).toEqual([null, '∅', 'a', '␣', 'b']);
    expect(within(rows[3]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['2', '1', '1']);
    expect(within(card).getByText('D[12][10] = 7')).toBeVisible();
    expect(within(card).getByText('puntuación = 1 − distancia / max(m, n) = 1 − 7 / max(12, 10) = 0.4166666667')).toBeVisible();
  });
  it('shows the LCS corner with tokens and the score formula', async () => {
    const card = await open();
    const table = await within(card).findByRole('table', { name: 'Esquina de la matriz de LCS' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[0]!).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fila', '∅', 'ml', 'ai']);
    expect(rows.map((r) => within(r).queryByRole('rowheader')?.textContent ?? null)).toEqual([null, '∅', 'ai', 'ml']);
    expect(within(rows[2]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0', '0', '1']);
    expect(within(card).getByText('L[9][7] = 4')).toBeVisible();
    expect(within(card).getByText('puntuación = 2 × L / (p + q) = 2 × 4 / (9 + 7) = 0.5000000000')).toBeVisible();
  });
  it('shows the TF-IDF terms table and the dot product, norms, cosine and angle', async () => {
    const card = await open();
    const table = await within(card).findByRole('table', { name: 'Términos compartidos con mayor producto' });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[0]!).getAllByRole('columnheader').map((c) => c.textContent))
      .toEqual(['Término', 'Recuento A', 'Recuento B', 'DF', 'IDF', 'Peso A', 'Peso B', 'Producto']);
    expect(within(rows[1]!).getAllByRole('cell').map((c) => c.textContent))
      .toEqual(['identifying', '1', '2', '2', '2.302585', '0.575646', '1.151293', '6.6274e-01']);
    expect(within(rows[2]!).getAllByRole('cell')[0]).toHaveTextContent('content');
    expect(within(card).getByText('⟨a, b⟩ = 9.636616e-04')).toBeVisible();
    expect(within(card).getByText('‖a‖ = 0.136847')).toBeVisible();
    expect(within(card).getByText('‖b‖ = 0.128832')).toBeVisible();
    expect(within(card).getByText('coseno = 0.2500000000')).toBeVisible();
    expect(within(card).getByText('ángulo = 75.5225°')).toBeVisible();
  });
  it('shows a Spanish error by code and allows retrying', async () => {
    post.mockImplementation(async (config) => {
      if (config.url !== '/similarity/steps') return { data: similarity, status: 200, statusText: 'OK', headers: {}, config };
      throw new AxiosError('Request failed', undefined, config, undefined, { data: { code: 'PAPER_NOT_FOUND', message: 'Paper was not found.' }, status: 404, statusText: 'Not Found', headers: {}, config });
    });
    const card = await open();
    expect(await within(card).findByRole('alert')).toHaveTextContent('No se encontró alguno de los artículos elegidos. Recarga la página para actualizar el catálogo.');
    expect(within(card).queryByRole('table', { name: 'Esquina de la matriz de LCS' })).not.toBeInTheDocument();
    post.mockImplementation(async (config) => ({ data: config.url === '/similarity/steps' ? stepsFixture() : similarity, status: 200, statusText: 'OK', headers: {}, config }));
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    expect(await within(card).findByRole('table', { name: 'Esquina de la matriz de LCS' })).toBeVisible();
  });
  it('hides the steps again with the same button', async () => {
    const card = await open();
    await within(card).findByRole('table', { name: 'Esquina de la matriz de LCS' });
    fireEvent.click(within(card).getByRole('button', { name: 'Ocultar pasos' }));
    expect(within(card).queryByRole('table', { name: 'Esquina de la matriz de LCS' })).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Ver paso a paso' })).toBeVisible();
  });
});
