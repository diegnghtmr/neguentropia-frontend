import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
import { Search } from './Search';
import { catalogFixture, detailFixture, searchFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
let post: ReturnType<typeof vi.fn<AxiosAdapter>>;
let catalogAvailable = true;
beforeEach(() => {
  catalogAvailable = true;
  post = vi.fn<AxiosAdapter>(async (config) => ({ data: searchFixture(), status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = async (config) => {
    if (config.method === 'get') {
      if (config.url === '/papers') {
        if (!catalogAvailable) {
          throw new AxiosError('offline', undefined, config);
        }
        return { data: catalogFixture(), status: 200, statusText: 'OK', headers: {}, config };
      }
      const id = decodeURIComponent((config.url ?? '').replace('/papers/', ''));
      return { data: detailFixture(id), status: 200, statusText: 'OK', headers: {}, config };
    }
    return post(config);
  };
});
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
const input = () => screen.getByRole('textbox', { name: 'Patrón' });
const action = () => screen.getByRole('button', { name: 'Buscar' });
function search(pattern = 'aba') {
  fireEvent.change(input(), { target: { value: pattern } });
  fireEvent.click(action());
}
describe('Search screen', () => {
  it('shows the skeleton as the only loading signal', async () => {
    post.mockImplementation(() => new Promise(() => undefined));
    render(<Search />);
    search();
    expect(await screen.findByRole('status', { name: 'Buscando' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Working' })).not.toBeInTheDocument();
    expect(action()).toBeDisabled();
  });
  it('shows a text-free skeleton while searching', async () => {
    let release!: () => void;
    post.mockImplementation((config) => new Promise((resolve) => { release = () => resolve({ data: searchFixture(), status: 200, statusText: 'OK', headers: {}, config }); }));
    render(<Search />);
    search();
    const loading = await screen.findByRole('status', { name: 'Buscando' });
    expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
    expect(loading.textContent).toBe('');
    expect(screen.queryByText('Buscando')).not.toBeInTheDocument();
    release();
    await screen.findByText('3 coincidencias en 2 artículos.');
  });
  it('keeps the side panel free of explanatory notes', () => {
    render(<Search />);
    expect(screen.queryByText(/tal como lo escribes/)).not.toBeInTheDocument();
  });
  it('disables the action while the pattern is empty', () => {
    render(<Search />);
    expect(action()).toBeDisabled();
    fireEvent.change(input(), { target: { value: 'a' } });
    expect(action()).toBeEnabled();
  });
  it('sends the pattern with the three methods', async () => {
    render(<Search />);
    search();
    await screen.findByText('3 coincidencias en 2 artículos.');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({ pattern: 'aba', methods: ['kmp', 'boyer-moore', 'rabin-karp'] });
  });
  it('shows the timings table, agreement line and papers with highlighted matches', async () => {
    render(<Search />);
    search();
    await screen.findByText('3 coincidencias en 2 artículos.');
    const table = screen.getByRole('table', { name: 'Tiempos por método' });
    const rows = within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(screen.getByText('Una sola ejecución. El preprocesamiento prepara el patrón; la búsqueda recorre los abstracts.')).toBeVisible();
    expect(rows).toEqual([
      ['KMP', '0.0123', '0.4500'],
      ['Boyer-Moore', '0.0234', '0.3500'],
      ['Rabin-Karp', '0.0345', '0.5500'],
    ]);
    expect(screen.queryByText(/encontraron las mismas|mismas posiciones/)).not.toBeInTheDocument();
    const first = await screen.findByRole('article', { name: 'Paper 2' });
    expect(within(first).getByText('2 coincidencias')).toBeVisible();
    const marks = within(first).getAllByText((_, element) => element?.tagName === 'MARK');
    expect(marks.map((mark) => mark.textContent)).toEqual(['ababa']);
    expect(first.textContent).toContain('xababa tail 2');
    const second = screen.getByRole('article', { name: 'Paper 5' });
    expect(within(second).getByText('1 coincidencia')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
  it('shows the summary, then the timings table, then the papers', async () => {
    render(<Search />);
    search();
    const summary = await screen.findByText('3 coincidencias en 2 artículos.');
    const article = screen.getByRole('article', { name: 'Paper 2' });
    const table = screen.getByRole('table', { name: 'Tiempos por método' });
    const before = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(summary.compareDocumentPosition(table) & before).toBeTruthy();
    expect(table.compareDocumentPosition(article) & before).toBeTruthy();
  });
  it('tells the user what to do before any search', () => {
    render(<Search />);
    expect(screen.getByText('Escribe un patrón y ejecuta la búsqueda.')).toBeVisible();
  });
  it('lists papers with more matches first and keeps corpus order on ties', async () => {
    const data = searchFixture();
    for (const result of data.results) {
      result.papers[1]!.positions = [1];
      result.papers[4]!.positions = [1, 3];
      result.papers[8]!.positions = [1, 3];
    }
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search();
    await screen.findByText('5 coincidencias en 3 artículos.');
    expect(screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual(['Paper 5', 'Paper 9', 'Paper 2']);
  });
  it('does not warn about titles when the catalog loads', async () => {
    render(<Search />);
    search();
    await screen.findByText('3 coincidencias en 2 artículos.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('falls back to the paper id when the catalog is unavailable', async () => {
    catalogAvailable = false;
    const data = searchFixture();
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search();
    expect(await screen.findByRole('article', { name: 'paper-2' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los títulos. Se muestran los identificadores.');
  });
  it('shows an empty state when nothing matches', async () => {
    const data = searchFixture();
    for (const result of data.results) {
      result.papers = result.papers.map((paper) => ({ paperId: paper.paperId, positions: [] }));
    }
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search('zzz');
    expect(await screen.findByText('Sin coincidencias')).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText(/coincidencias en/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mismas/)).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Tiempos por método' })).toBeVisible();
  });
  it('shows the Spanish message for the error code, not the backend text', async () => {
    post.mockImplementation(async (config) => {
      throw new AxiosError('bad', 'ERR_BAD_REQUEST', config, undefined, {
        data: { code: 'INVALID_INPUT', message: 'Pattern must not be empty.' }, status: 400, statusText: 'Bad Request', headers: {}, config,
      });
    });
    render(<Search />);
    search();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El patrón no es válido. Escribe un texto y vuelve a intentarlo.');
    expect(alert).not.toHaveTextContent('INVALID_INPUT');
    expect(alert).not.toHaveTextContent('Pattern must not be empty.');
  });
});
