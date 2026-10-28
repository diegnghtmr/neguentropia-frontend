import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
import { Similarity } from './Similarity';
import { catalogFixture, geminiSimilarityFixture, localSimilarityFixture, similarityFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
let post: ReturnType<typeof vi.fn<AxiosAdapter>>;
beforeEach(() => {
  post = vi.fn<AxiosAdapter>(async (config) => ({ data: similarityFixture(), status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = async (config) => config.method === 'get'
    ? { data: catalogFixture(), status: 200, statusText: 'OK', headers: {}, config }
    : post(config);
});
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
const scales = 'Los puntajes clásicos van de 0 a 1 y los cosenos de embeddings, de -1 a 1.';
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Calcular similitud' }));
const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
const paperOption = (n: number) => `paper-${n} Paper ${n}`;
async function openPapers() {
  const existing = screen.queryByRole('searchbox');
  if (existing) return existing;
  fireEvent.click(await screen.findByRole('button', { name: 'Artículos' }));
  return screen.findByRole('searchbox');
}
async function pickPapers(...numbers: number[]) {
  const search = await openPapers();
  for (const n of numbers) fireEvent.click(screen.getByRole('checkbox', { name: paperOption(n) }));
  fireEvent.keyDown(search, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument());
}
const selectPair = () => pickPapers(2, 1);
const selected = () => screen.queryByRole('list', { name: 'Artículos seleccionados' });
describe('Similarity screen', () => {
  it('shows a text-free skeleton while the paper list loads', () => {
    render(<Similarity />);
    const loading = screen.getByRole('status', { name: 'Cargando los artículos' });
    expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
    expect(loading.textContent).toBe('');
  });
  it('requires two papers and at least one method and sends manifest and requested order', async () => {
    render(<Similarity />);
    const button = screen.getByRole('button', { name: 'Calcular similitud' });
    expect(button).toBeDisabled();
    await pickPapers(2); expect(button).toBeDisabled();
    await pickPapers(1); expect(button).toBeEnabled();
    for (const method of ['Levenshtein', 'LCS', 'Coseno TF-IDF', 'Jaccard', 'Embeddings de Gemini', 'Embeddings locales']) check(method);
    expect(button).toBeDisabled();
    check('Jaccard'); check('LCS');
    const f = similarityFixture();
    post.mockImplementation(async (config) => ({ data: { ...f, methods: ['lcs', 'jaccard'], pairs: f.pairs.map((p) => ({ ...p, results: p.results.filter((r) => ['lcs', 'jaccard'].includes(r.method)) })) }, status: 200, statusText: 'OK', headers: {}, config }));
    run(); await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({ paperIds: ['paper-1', 'paper-2'], methods: ['lcs', 'jaccard'] });
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('offers the papers in a searchable multi-select with Spanish copy and no icons', async () => {
    render(<Similarity />);
    const search = await openPapers();
    expect(search).toHaveAttribute('placeholder', 'Buscar por título o id');
    expect(screen.getByRole('button', { name: 'Artículos' })).toHaveTextContent('Elige dos o más');
    expect(screen.getAllByRole('checkbox', { name: /^paper-\d+ Paper \d+$/ })).toHaveLength(20);
    expect(document.querySelector('[data-slot="item-adornment"]')).toBeNull();
    expect(screen.getByRole('group', { name: 'Métodos' }).querySelector('.similarity-methods')).not.toBeNull();
    expect(document.querySelector('.similarity-papers')).toBeNull();
  });
  it('filters the options by title or id while typing', async () => {
    render(<Similarity />);
    const search = await openPapers();
    fireEvent.change(search, { target: { value: 'Paper 7' } });
    expect(screen.getAllByRole('checkbox', { name: /^paper-/ })).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'paper-7 Paper 7' })).toBeVisible();
    fireEvent.change(search, { target: { value: 'paper-13' } });
    expect(screen.getByRole('checkbox', { name: 'paper-13 Paper 13' })).toBeVisible();
    expect(screen.queryByRole('checkbox', { name: 'paper-7 Paper 7' })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No hay artículos que coincidan')).toBeVisible();
  });
  it('shows the chosen papers as removable selections that deselect', async () => {
    render(<Similarity />);
    await selectPair();
    const chips = within(selected()!).getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent)).toEqual(['paper-1', 'paper-2']);
    const button = screen.getByRole('button', { name: 'Calcular similitud' });
    expect(button).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar paper-1 Paper 1' }));
    expect(within(selected()!).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Artículos' })).toHaveTextContent('1 seleccionado');
    expect(button).toBeDisabled();
  });
  it('selects all 20 papers at once, sends them in corpus order and then clears them', async () => {
    render(<Similarity />);
    const all = await screen.findByRole('button', { name: 'Seleccionar los 20' });
    fireEvent.click(all);
    expect(screen.getByRole('button', { name: 'Artículos' })).toHaveTextContent('20 seleccionados');
    expect(screen.queryByRole('button', { name: 'Seleccionar los 20' })).not.toBeInTheDocument();
    run(); await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string).paperIds).toEqual(Array.from({ length: 20 }, (_, i) => `paper-${i + 1}`));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar todos' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artículos' })).toHaveTextContent('Elige dos o más');
    expect(screen.getByRole('button', { name: 'Seleccionar los 20' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Calcular similitud' })).toBeDisabled();
  });
  it('sends the ids in corpus order whatever the click order', async () => {
    render(<Similarity />);
    await pickPapers(5, 3, 9); run(); await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string).paperIds).toEqual(['paper-3', 'paper-5', 'paper-9']);
  });
  it('shows the selected count only in the field, once', async () => {
    render(<Similarity />);
    await selectPair();
    expect(screen.getByRole('button', { name: 'Artículos' })).toHaveTextContent('2 seleccionados');
    expect(screen.queryByText(/20 artículos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Escape cierra/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: 'Métodos' })).toHaveLength(1);
  });
  it('puts the scales once under each pair table and not in the side panel', async () => {
    const f = similarityFixture();
    post.mockImplementation(async (config) => ({ data: { ...f, paperIds: ['paper-1', 'paper-2', 'paper-3'], pairs: [f.pairs[0]!, { ...f.pairs[0]!, left: 'paper-1', right: 'paper-3' }] }, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Similarity />); await selectPair(); await pickPapers(3); run();
    const tables = await screen.findAllByRole('table');
    expect(screen.getAllByText(scales)).toHaveLength(2);
    for (const table of tables) {
      expect(within(table).getByText(scales).tagName).toBe('CAPTION');
    }
  });
  it('tells the user what to do before any comparison', () => {
    render(<Similarity />);
    expect(screen.getByText('Elige al menos dos artículos y ejecuta la comparación.')).toBeVisible();
  });
  it('selects all six methods by default and renders the Gemini result', async () => {
    post.mockImplementation(async (config) => ({ data: geminiSimilarityFixture(), status: 200, statusText: 'OK', headers: {}, config }));
    render(<Similarity />);
    const methods = within(screen.getByRole('group', { name: 'Métodos' })).getAllByRole('checkbox');
    expect(methods.map((checkbox) => checkbox.textContent)).toEqual(['Levenshtein', 'LCS', 'Coseno TF-IDF', 'Jaccard', 'Embeddings de Gemini', 'Embeddings locales']);
    for (const checkbox of methods) expect(checkbox).toBeChecked();
    await selectPair();
    check('Embeddings locales'); check('LCS'); check('LCS');
    run();
    const table = await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({
      paperIds: ['paper-1', 'paper-2'], methods: ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard', 'gemini-embeddings'],
    });
    const row = within(table).getAllByRole('row').at(-1)!;
    expect(row).toHaveTextContent('Embeddings de Gemini');
    for (const text of ['-0.1235', 'Modelo: gemini-embedding-2', 'Dimensión: 3072']) expect(within(row).getByText(text)).toBeVisible();
    expect(screen.getByText(scales)).toBeVisible();
    expect(screen.queryByText('Similarity results')).not.toBeInTheDocument();
  });
  it('renders both embedding rows with the default selection', async () => {
    post.mockImplementation(async (config) => ({ data: localSimilarityFixture(), status: 200, statusText: 'OK', headers: {}, config }));
    render(<Similarity />);
    await selectPair();
    run();
    const table = await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({
      paperIds: ['paper-1', 'paper-2'], methods: ['levenshtein', 'lcs', 'tf-idf-cosine', 'jaccard', 'gemini-embeddings', 'local-embeddings'],
    });
    const row = within(table).getAllByRole('row').at(-1)!;
    expect(row).toHaveTextContent('Embeddings locales');
    for (const text of ['0.8123', 'Modelo: intfloat/multilingual-e5-small', 'Dimensión: 384']) expect(within(row).getByText(text)).toBeVisible();
    expect(row).not.toHaveTextContent('input tokens');
  });
  it('shows the Spanish provider-unavailable message for local embeddings on 503', async () => {
    post.mockImplementation(async (config) => { throw new AxiosError('Request failed', undefined, config, undefined, { data: { code: 'PROVIDER_UNAVAILABLE', message: 'Local vectors are unavailable.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    render(<Similarity />); await selectPair(); run();
    expect(await screen.findByRole('alert')).toHaveTextContent('Los vectores de embeddings no están disponibles. Prueba con otros métodos.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('shows the Spanish provider-unavailable message for Gemini on 503', async () => {
    post.mockImplementation(async (config) => { throw new AxiosError('Request failed', undefined, config, undefined, { data: { code: 'PROVIDER_UNAVAILABLE', message: 'Gemini vectors are unavailable.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    render(<Similarity />); await selectPair(); run();
    expect(await screen.findByRole('alert')).toHaveTextContent('Los vectores de embeddings no están disponibles. Prueba con otros métodos.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('shows the two compared papers apart with a vs marker', async () => {
    render(<Similarity />); await selectPair(); run();
    const card = (await screen.findByRole('table', { name: 'Paper 1 vs Paper 2' })).closest('[data-slot="card"]') as HTMLElement;
    const pair = within(card).getByRole('heading', { name: 'Paper 1 vs Paper 2' });
    expect(within(pair).getByText('Paper 1')).toBeVisible();
    expect(within(card).getByText('vs')).toBeVisible();
    expect(within(pair).getByText('Paper 2')).toBeVisible();
  });
  it('renders pair titles, ordered rows, scores and explanations', async () => {
    render(<Similarity />); await selectPair(); run();
    const table = await screen.findByRole('table', { name: 'Paper 1 vs Paper 2' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.textContent)).toEqual(['Levenshtein', 'LCS', 'Coseno TF-IDF', 'Jaccard']);
    for (const text of ['0.5000', '0.6667', '0.6694', '0.3333']) expect(within(table).getByText(text)).toBeVisible();
    expect(rows[0]).toHaveTextContent('Distancia: 1');
    expect(rows[0]).toHaveTextContent('Longitud izquierda: 2');
    expect(rows[1]).toHaveTextContent('Longitud: 2');
    expect(rows[1]).toHaveTextContent('Tokens izquierdos: 3');
    expect(rows[1]).not.toHaveTextContent('Subsequence');
    expect(rows[2]).toHaveTextContent('Dimensión: 4');
    expect(rows[3]).toHaveTextContent('Intersección: 1');
    expect(rows[3]).toHaveTextContent('Unión: 3');
    expect(within(table).queryByText('Compute time (ms)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Preprocessing/)).not.toBeInTheDocument();
  });
  it('renders every received pair for three selected papers', async () => {
    const f = similarityFixture();
    post.mockImplementation(async (config) => ({ data: { ...f, paperIds: ['paper-1', 'paper-2', 'paper-3'], pairs: [
      f.pairs[0]!, { ...f.pairs[0]!, left: 'paper-1', right: 'paper-3' }, { ...f.pairs[0]!, left: 'paper-2', right: 'paper-3' },
    ] }, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Similarity />); await selectPair(); await pickPapers(3); run();
    expect((await screen.findAllByRole('table')).map((table) => table.getAttribute('aria-label'))).toEqual([
      'Paper 1 vs Paper 2', 'Paper 1 vs Paper 3', 'Paper 2 vs Paper 3',
    ]);
  });
  it.each(['Paper 1', 'Jaccard'])('clears the previous result when %s changes', async (name) => {
    render(<Similarity />); await selectPair(); run(); await screen.findByRole('table');
    if (name === 'Paper 1') fireEvent.click(screen.getByRole('button', { name: 'Quitar paper-1 Paper 1' }));
    else check(name);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('shows the Spanish message for the error code without retaining a prior result', async () => {
    render(<Similarity />); await selectPair(); run(); await screen.findByRole('table');
    post.mockImplementation(async (config) => { throw new AxiosError('Request failed', undefined, config, undefined, { data: { code: 'CORPUS_UNAVAILABLE', message: 'The paper corpus is unavailable.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    run(); expect(await screen.findByRole('alert')).toHaveTextContent('El corpus no está disponible. No se puede calcular la similitud.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('blocks duplicate runs and discards a response after selection changes', async () => {
    let resolve!: (value: Awaited<ReturnType<AxiosAdapter>>) => void;
    post.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<Similarity />); await selectPair(); run(); run();
    expect(post).toHaveBeenCalledTimes(1);
    {
      const loading = screen.getByRole('status', { name: 'Calculando la similitud' });
      expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
      expect(loading.textContent).toBe('');
      expect(screen.queryByText('Calculando la similitud')).not.toBeInTheDocument();
    }
    const config = post.mock.calls[0]![0];
    fireEvent.click(screen.getByRole('button', { name: 'Quitar paper-1 Paper 1' }));
    expect(config.signal?.aborted).toBe(true);
    await act(async () => { resolve({ data: similarityFixture(), status: 200, statusText: 'OK', headers: {}, config }); });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
