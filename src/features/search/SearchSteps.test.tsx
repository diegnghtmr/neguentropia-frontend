import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
import { Search } from './Search';
import { catalogFixture, detailFixture, searchFixture, stepsFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
let post: ReturnType<typeof vi.fn<AxiosAdapter>>;
let steps: ReturnType<typeof vi.fn<AxiosAdapter>>;
beforeEach(() => {
  post = vi.fn<AxiosAdapter>(async (config) => ({ data: searchFixture(), status: 200, statusText: 'OK', headers: {}, config }));
  steps = vi.fn<AxiosAdapter>(async (config) => ({ data: stepsFixture(), status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = async (config) => {
    if (config.method === 'get') {
      if (config.url === '/papers') {
        return { data: catalogFixture(), status: 200, statusText: 'OK', headers: {}, config };
      }
      const id = decodeURIComponent((config.url ?? '').replace('/papers/', ''));
      return { data: detailFixture(id), status: 200, statusText: 'OK', headers: {}, config };
    }
    if (config.url === '/search/steps') {
      return steps(config);
    }
    return post(config);
  };
});
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
async function openSteps() {
  render(<Search />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Patrón' }), { target: { value: 'aba' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  const card = await screen.findByRole('article', { name: 'Paper 2' });
  fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
  await within(card).findByText('Fragmento');
  return card;
}
function rowsOf(table: HTMLElement) {
  return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
}
describe('Search steps', () => {
  it('offers one button per paper with matches and loads nothing until it is pressed', async () => {
    render(<Search />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Patrón' }), { target: { value: 'aba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByRole('article', { name: 'Paper 2' });
    expect(screen.getAllByRole('button', { name: 'Ver paso a paso' })).toHaveLength(2);
    expect(steps).not.toHaveBeenCalled();
  });
  it('posts the searched pattern and the paper id and shows a skeleton while loading', async () => {
    let release!: () => void;
    steps.mockImplementation((config) => new Promise((resolve) => { release = () => resolve({ data: stepsFixture(), status: 200, statusText: 'OK', headers: {}, config }); }));
    render(<Search />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Patrón' }), { target: { value: 'aba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const card = await screen.findByRole('article', { name: 'Paper 2' });
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    const loading = await within(card).findByRole('status', { name: 'Cargando pasos' });
    expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
    expect(loading.textContent).toBe('');
    expect(JSON.parse(steps.mock.calls[0]![0].data as string)).toEqual({ pattern: 'aba', paperId: 'paper-2' });
    release();
    await within(card).findByText('Fragmento');
    expect(within(card).queryByRole('status', { name: 'Cargando pasos' })).not.toBeInTheDocument();
  });
  it('shows the fragment, where it starts and its matches', async () => {
    const card = await openSteps();
    expect(within(card).getByText('Fragmento')).toBeVisible();
    expect(within(card).getByText('El fragmento empieza en la posición 7 del abstract. Coincidencia en la posición 4 del fragmento (11 en el abstract).')).toBeVisible();
    const marks = within(card).getAllByText((_, element) => element?.tagName === 'MARK' && element.closest('.search-fragment') !== null);
    expect(marks.map((mark) => mark.textContent)).toEqual(['aba']);
    expect(card.querySelector('.search-fragment')?.textContent).toBe('xab aba');
  });
  it('shows the KMP failure table and the walk with spaces drawn as a visible mark', async () => {
    const card = await openSteps();
    expect(within(card).getByRole('tab', { name: 'KMP', selected: true })).toBeVisible();
    expect(rowsOf(within(card).getByRole('table', { name: 'Tabla failure de KMP' }))).toEqual([
      ['0', 'a', 'ninguno', '0'],
      ['1', 'ab', 'ninguno', '0'],
      ['2', 'aba', 'a', '1'],
    ]);
    expect(within(card).getByRole('table', { name: 'Recorrido de KMP' })).toBeVisible();
    expect(rowsOf(within(card).getByRole('table', { name: 'Recorrido de KMP' }))).toEqual([
      ['0', 'x', '0', 'ninguno', '0', ''],
      ['1', 'a', '0', 'ninguno', '1', ''],
      ['2', 'b', '1', 'ninguno', '2', ''],
      ['3', '␣', '2', '2 → 0', '0', ''],
      ['4', 'a', '0', 'ninguno', '1', ''],
      ['5', 'b', '1', 'ninguno', '2', ''],
      ['6', 'a', '2', 'ninguno', '1', 'coincidencia en 4; continúa con m=1'],
    ]);
  });
  it('shows the Boyer-Moore table and each alignment with its marker and sentence', async () => {
    const card = await openSteps();
    fireEvent.mouseDown(within(card).getByRole('tab', { name: 'Boyer-Moore' }));
    expect(rowsOf(within(card).getByRole('table', { name: 'Última aparición de cada carácter' }))).toEqual([
      ['a', '2'],
      ['b', '1'],
      ['cualquier otro', '-1'],
    ]);
    expect(within(card).getByText('s=0: 0 comparaciones correctas desde la derecha; falla en j=2 (texto b ≠ patrón a); última(b)=1; desplazamiento = max(1, 2 − 1) = 1.')).toBeVisible();
    expect(within(card).getByText('s=1: 0 comparaciones correctas desde la derecha; falla en j=2 (texto ␣ ≠ patrón a); última(␣)=-1; desplazamiento = max(1, 2 − -1) = 3.')).toBeVisible();
    expect(within(card).getByText('s=4: coincidencia completa tras 3 comparaciones correctas; avanza 1.')).toBeVisible();
    const blocks = [...card.querySelectorAll('pre.search-alignment')].map((block) => block.textContent);
    expect(blocks).toEqual([
      'texto  : xab aba\npatrón : aba\nmarca  :   ^',
      'texto  : xab aba\npatrón :  aba\nmarca  :    ^',
      'texto  : xab aba\npatrón :     aba\nmarca  :     ^^^',
    ]);
  });
  it('shows the Rabin-Karp constants, the windows and marks collisions', async () => {
    const data = stepsFixture();
    data.rabinKarp.windows[2] = { start: 2, text: 'b a', hash: 6382177, equalHash: true, match: false };
    steps.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    const card = await openSteps();
    fireEvent.mouseDown(within(card).getByRole('tab', { name: 'Rabin-Karp' }));
    expect(within(card).getByText('Base: 256')).toBeVisible();
    expect(within(card).getByText('Módulo: 1000000007')).toBeVisible();
    expect(within(card).getByText('Hash del patrón: 6382177')).toBeVisible();
    expect(within(card).getByText('high: 65536')).toBeVisible();
    expect(rowsOf(within(card).getByRole('table', { name: 'Ventanas de Rabin-Karp' }))).toEqual([
      ['0', 'xab', '7889250', 'no', ''],
      ['1', 'ab␣', '6382112', 'no', ''],
      ['2', 'b␣a', '6382177', 'sí', 'colisión'],
      ['3', '␣ab', '2122082', 'no', ''],
      ['4', 'aba', '6382177', 'sí', 'coincidencia'],
    ]);
  });
  it('agrees with the positions Java returned for the fragment', async () => {
    const card = await openSteps();
    const kmpNotes = rowsOf(within(card).getByRole('table', { name: 'Recorrido de KMP' })).map((row) => row[5]).filter((note) => note !== '');
    expect(kmpNotes).toEqual(['coincidencia en 4; continúa con m=1']);
    fireEvent.mouseDown(within(card).getByRole('tab', { name: 'Boyer-Moore' }));
    expect(card.querySelectorAll('pre.search-alignment')[2]!.textContent).toContain('patrón :     aba');
    fireEvent.mouseDown(within(card).getByRole('tab', { name: 'Rabin-Karp' }));
    const matches = rowsOf(within(card).getByRole('table', { name: 'Ventanas de Rabin-Karp' })).filter((row) => row[4] === 'coincidencia');
    expect(matches.map((row) => row[0])).toEqual(['4']);
  });
  it('hides the steps again and loads them again on request', async () => {
    const card = await openSteps();
    fireEvent.click(within(card).getByRole('button', { name: 'Ocultar pasos' }));
    expect(within(card).queryByText('Fragmento')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    await within(card).findByText('Fragmento');
    expect(steps).toHaveBeenCalledTimes(2);
  });
  it('shows the Spanish message for the error code and allows trying again', async () => {
    steps.mockImplementationOnce(async (config) => {
      throw new AxiosError('missing', 'ERR_BAD_REQUEST', config, undefined, {
        data: { code: 'PAPER_NOT_FOUND', message: 'Paper was not found.' }, status: 404, statusText: 'Not Found', headers: {}, config,
      });
    });
    render(<Search />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Patrón' }), { target: { value: 'aba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const card = await screen.findByRole('article', { name: 'Paper 2' });
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('El artículo no existe en el corpus.');
    expect(alert).not.toHaveTextContent('PAPER_NOT_FOUND');
    expect(alert).not.toHaveTextContent('Paper was not found.');
    fireEvent.click(within(card).getByRole('button', { name: 'Ver paso a paso' }));
    await within(card).findByText('Fragmento');
  });
  it('does not use the characters reserved for the document copy', async () => {
    const card = await openSteps();
    expect(card.textContent).not.toMatch(/[·—–]/);
  });
});
