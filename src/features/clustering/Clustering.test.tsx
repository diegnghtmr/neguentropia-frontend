import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
import { readFileSync } from 'node:fs';
import { Clustering } from './Clustering';
import { catalogFixture, clusteringFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
let post: ReturnType<typeof vi.fn<AxiosAdapter>>;
let catalogAvailable = true;
beforeEach(() => {
  catalogAvailable = true;
  post = vi.fn<AxiosAdapter>(async (config) => ({ data: clusteringFixture(), status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = async (config) => {
    if (config.method === 'get') {
      if (!catalogAvailable) {
        throw new AxiosError('offline', undefined, config);
      }
      return { data: catalogFixture(), status: 200, statusText: 'OK', headers: {}, config };
    }
    return post(config);
  };
});
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Ejecutar agrupamiento' }));
async function choose(count: string) {
  const trigger = screen.getByRole('combobox', { name: 'Cantidad de grupos' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: count });
  option.focus();
  fireEvent.keyDown(option, { key: 'Enter' });
}
const mutedRule = /\.merge-muted[^{]*\{[^}]*\}/.exec(readFileSync('src/styles.css', 'utf8'))?.[0] ?? '';
describe('Clustering screen', () => {
  it('keeps the side panel free of explanatory notes', () => {
    render(<Clustering />);
    expect(screen.queryByText(/La silueta va de/)).not.toBeInTheDocument();
  });
  it('starts empty with two clusters selected and the 2 to 19 range', async () => {
    render(<Clustering />);
    expect(screen.getByText('Elige la cantidad de grupos y ejecuta el agrupamiento.')).toBeVisible();
    const trigger = screen.getByRole('combobox', { name: 'Cantidad de grupos' });
    expect(trigger).toHaveTextContent('2');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(Array.from({ length: 18 }, (_, i) => String(i + 2)));
  });
  it('sends the selected cluster count and renders three dendrograms in order', async () => {
    render(<Clustering />);
    await choose('7');
    run();
    await screen.findAllByRole('img');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({ clusterCount: 7 });
    const images = screen.getAllByRole('img');
    expect(images.map((image) => image.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('Dendrograma de Single linkage'),
      expect.stringContaining('Dendrograma de Complete linkage'),
      expect.stringContaining('Dendrograma de Average linkage'),
    ]);
    for (const image of images) {
      expect(image.querySelectorAll('[data-leaf]')).toHaveLength(20);
      expect(image.querySelectorAll('[data-merge]')).toHaveLength(19);
    }
    for (const value of ['0.1234', '0.4321', '0.2222']) {
      expect(screen.getByText(`Silueta ${value}`)).toBeVisible();
    }
  });
  it('marks the method with the highest silhouette in its card and in the summary table', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getAllByText('Mayor silueta')).toHaveLength(2);
    expect(screen.queryByText(/Más coherente/)).not.toBeInTheDocument();
  });
  it('compares the three silhouettes in a table above the method cards', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Silueta por método' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Método', 'Silueta', 'Tamaños de los grupos']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
      ['Single linkage', '0.1234', '16, 4'],
      ['Complete linkage Mayor silueta', '0.4321', '16, 4'],
      ['Average linkage', '0.2222', '16, 4'],
    ]);
    expect(within(rows[1]!).getByText('Mayor silueta')).toBeVisible();
    expect(within(rows[0]!).queryByText('Mayor silueta')).not.toBeInTheDocument();
    expect(within(rows[1]!).getAllByRole('cell')[1]).toHaveClass('-num');
    expect(table.compareDocumentPosition(screen.getAllByRole('img')[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('says so when silhouettes are tied', async () => {
    const tied = clusteringFixture();
    for (const result of tied.results) {
      result.silhouette = 0.3;
    }
    post.mockImplementation(async (config) => ({ data: tied, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getByText('Todos los métodos tienen la misma silueta.')).toBeVisible();
    expect(screen.queryByText('Mayor silueta')).not.toBeInTheDocument();
    expect(screen.queryByText(/Más coherente:/)).not.toBeInTheDocument();
  });
  it('names both methods when two tie for the highest silhouette', async () => {
    const twoWinners = clusteringFixture();
    twoWinners.results[0]!.silhouette = 0.5;
    twoWinners.results[1]!.silhouette = 0.2;
    twoWinners.results[2]!.silhouette = 0.5;
    post.mockImplementation(async (config) => ({ data: twoWinners, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getAllByText('Mayor silueta')).toHaveLength(4);
    expect(screen.queryByText(/misma silueta/)).not.toBeInTheDocument();
  });
  it('shows each group with its size and paper ids before the titles', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = await screen.findAllByRole('list', { name: 'Grupos de Complete linkage' });
    expect(groups[0]!.children).toHaveLength(2);
    const first = groups[0]!.children[0] as HTMLElement;
    const group = groups[0]!.children[1] as HTMLElement;
    expect(within(first).getByText('Grupo 1 (16 artículos)')).toBeVisible();
    expect(within(group).getByText('Grupo 2 (4 artículos)')).toBeVisible();
    const items = within(within(group).getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['paper-17 Paper 17', 'paper-18 Paper 18', 'paper-19 Paper 19', 'paper-20 Paper 20']);
    expect(within(items[0]!).getByText('paper-17')).toBeVisible();
    expect(group).not.toHaveTextContent(',');
    expect(groups[0]!.querySelector('[data-group-dot]')).toBeNull();
    expect(first.style.borderLeftColor).toBe('');
  });
  it('uses the same color for the paper pills of a group and its leaf labels', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = await screen.findAllByRole('list', { name: 'Grupos de Complete linkage' });
    const svg = screen.getAllByRole('img')[1]!;
    const token = (value: string | null) => /var\(--[a-z-]+\)/.exec(value ?? '')?.[0];
    const pills = [0, 1].map((i) => groups[0]!.children[i]!.querySelector('.paper-id')!);
    const first = token(pills[0]!.getAttribute('style'));
    const second = token(pills[1]!.getAttribute('style'));
    expect(first).toBeDefined();
    expect(first).not.toBe(second);
    expect(svg.querySelector('[data-leaf-pill="0"]')!.getAttribute('fill')).toBe(first);
    expect(svg.querySelector('[data-leaf-pill="15"]')!.getAttribute('fill')).toBe(first);
    expect(svg.querySelector('[data-leaf-pill="16"]')!.getAttribute('fill')).toBe(second);
    expect(svg.querySelector('[data-leaf-pill="19"]')!.getAttribute('fill')).toBe(second);
  });
  it('fills a leaf pill with the same color as the list pill of that paper and tints the group block', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = await screen.findAllByRole('list', { name: 'Grupos de Complete linkage' });
    const svg = screen.getAllByRole('img')[1]!;
    const token = (value: string | null) => /var\(--[a-z-]+\)/.exec(value ?? '')?.[0];
    const block = groups[0]!.children[1] as HTMLElement;
    const listPill = within(block).getByText('paper-17');
    expect(token(listPill.getAttribute('style'))).toBe(svg.querySelector('[data-leaf-pill="16"]')!.getAttribute('fill'));
    expect(block.getAttribute('style')).toContain('-soft)');
  });
  it('draws the cut line from the number of groups', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    for (const image of screen.getAllByRole('img')) {
      expect(image.querySelectorAll('[data-cut]')).toHaveLength(1);
    }
  });
  it('keeps the merge steps collapsed by default with a count in the summary', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getAllByText('Pasos de fusión (19)')).toHaveLength(3);
    for (const details of document.querySelectorAll('details')) {
      expect(details).not.toHaveAttribute('open');
    }
  });
  it('draws the merge steps as a named table with 19 rows and one cut separator', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Paso', 'Une', 'Distancia']);
    const rows = within(table.querySelector('tbody')!).getAllByRole('row');
    expect(rows).toHaveLength(20);
    expect(table.querySelectorAll('[data-merge-row]')).toHaveLength(19);
    expect(table.querySelectorAll('[data-cut-row]')).toHaveLength(1);
  });
  it('puts the separator right after the last applied merge', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    const rows = within(table.querySelector('tbody')!).getAllByRole('row');
    expect(rows[17]).toHaveTextContent('18');
    expect(rows[18]).toHaveAttribute('data-cut-row');
    expect(rows[18]).toHaveTextContent('Corte: 2 grupos');
    expect(rows[18].querySelector('td')).toHaveAttribute('colspan', '3');
    expect(rows[19]).toHaveTextContent('19');
    const five = clusteringFixture();
    for (const result of five.results) {
      result.partition = [0, 4, 8, 12, 16].map((start) => ({ paperIds: Array.from({ length: 4 }, (_, j) => `paper-${start + j + 1}`) }));
    }
    post.mockImplementation(async (config) => ({ data: five, status: 200, statusText: 'OK', headers: {}, config }));
    run();
    const cuts = await screen.findAllByText('Corte: 5 grupos');
    const cut = cuts[0]!.closest('tr')!;
    const body = cut.parentElement!;
    expect(Array.from(body.children).indexOf(cut)).toBe(15);
  });
  it('shows a paper pill for leaves and a step pill with its size for earlier merges', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    const rows = table.querySelectorAll<HTMLElement>('[data-merge-row]');
    const first = rows[0]!;
    expect(first).toHaveTextContent('1');
    expect(within(first).getByText('paper-1')).toBeInTheDocument();
    expect(within(first).getByText('paper-2')).toBeInTheDocument();
    expect(first).toHaveTextContent('paper-1 + paper-2');
    const token = (value: string | null) => /var\(--[a-z-]+\)/.exec(value ?? '')?.[0];
    expect(token(within(first).getByText('paper-1').getAttribute('style'))).toBe(token(screen.getAllByRole('list', { name: 'Grupos de Complete linkage' })[0]!.children[0]!.querySelector('.paper-id')!.getAttribute('style')));
    const sixteenth = rows[15]!;
    expect(within(sixteenth).getByText('paso 11 (4 artículos)')).toBeInTheDocument();
    const last = rows[18]!;
    expect(last).toHaveTextContent('paso 18 (16 artículos) + paso 15 (4 artículos)');
    expect(within(last).getByText('paso 18 (16 artículos)').getAttribute('style')).toContain('--v-');
    expect(within(last).getByText('paso 15 (4 artículos)').getAttribute('style')).toContain('--v-');
  });
  it('colors a merge across groups neutral and a merge inside one group with the group color', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    const rows = table.querySelectorAll<HTMLElement>('[data-merge-row]');
    const across = rows[18]!;
    expect(across.querySelector('[data-pill-neutral]')).toBeNull();
    const inside = rows[0]!.querySelector('.paper-id')!;
    expect(inside.getAttribute('style')).toMatch(/--v-(pink|blue)\)/);
  });
  it('shows each distance with four decimals and no bar', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    const rows = table.querySelectorAll<HTMLElement>('[data-merge-row]');
    expect(rows[0]).toHaveTextContent('0.0500');
    expect(rows[18]).toHaveTextContent('0.7700');
    expect(table.querySelector('[data-bar]')).toBeNull();
    for (const row of rows) {
      expect(row.querySelectorAll('td')[2]).toHaveClass('-num');
    }
  });
  it('mutes the rows after the cut', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const table = screen.getByRole('table', { name: 'Pasos de fusión de Complete linkage' });
    const rows = table.querySelectorAll<HTMLElement>('[data-merge-row]');
    expect(rows[17]).not.toHaveAttribute('data-muted');
    expect(rows[18]).toHaveAttribute('data-muted', 'true');
    expect(table.querySelectorAll('[data-muted]')).toHaveLength(1);
    expect(mutedRule).toMatch(/color:\s*var\(--v-text-3\)/);
    expect(mutedRule).not.toMatch(/opacity/);
  });
  it('falls back to paper ids when the catalog is unavailable', async () => {
    catalogAvailable = false;
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = screen.getAllByRole('list', { name: 'Grupos de Single linkage' });
    const group = groups[0]!.children[1] as HTMLElement;
    expect(within(within(group).getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['paper-17', 'paper-18', 'paper-19', 'paper-20']);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los títulos. Se muestran los identificadores.');
  });
  it('does not warn about titles when the catalog loads', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('shows the Spanish message for the error code and no stale result', async () => {
    post.mockImplementation(async (config) => { throw new AxiosError('failed', undefined, config, undefined, { data: { code: 'CORPUS_UNAVAILABLE', message: 'Corpus is not ready.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    render(<Clustering />);
    run();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El corpus no está disponible. No se puede agrupar.');
    expect(alert).not.toHaveTextContent('CORPUS_UNAVAILABLE');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
  it('uses the singular for a group with one paper', async () => {
    const single = clusteringFixture();
    for (const result of single.results) {
      result.partition = [{ paperIds: Array.from({ length: 19 }, (_, i) => `paper-${i + 1}`) }, { paperIds: ['paper-20'] }];
    }
    post.mockImplementation(async (config) => ({ data: single, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getAllByText('Grupo 2 (1 artículo)')).toHaveLength(3);
  });
  it('shows a Spanish fallback when the backend cannot be reached', async () => {
    post.mockImplementation(async (config) => { throw new AxiosError('Network Error', undefined, config); });
    render(<Clustering />);
    run();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo ejecutar el agrupamiento. Revisa la conexión y la configuración del backend.');
  });
  it('shows a loading state and prevents double submission', async () => {
    let release!: () => void;
    post.mockImplementation((config) => new Promise((resolve) => { release = () => resolve({ data: clusteringFixture(), status: 200, statusText: 'OK', headers: {}, config }); }));
    render(<Clustering />);
    run();
    await screen.findByRole('status', { name: 'Ejecutando el agrupamiento' });
    {
      const loading = screen.getByRole('status', { name: 'Ejecutando el agrupamiento' });
      expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
      expect(loading.textContent).toBe('');
      expect(screen.queryByText('Ejecutando el agrupamiento')).not.toBeInTheDocument();
    }
    run();
    expect(post).toHaveBeenCalledTimes(1);
    release();
    await screen.findAllByRole('img');
  });
  it('discards the result when the cluster count changes', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    await choose('3');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByText('Elige la cantidad de grupos y ejecuta el agrupamiento.')).toBeVisible();
  });
});
