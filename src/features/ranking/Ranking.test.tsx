import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ranking } from './Ranking';
import { loadRanking } from './client';
import { rankingSchema } from './schemas';
import { rankingFixture } from './fixtures.test-support';

vi.mock('./client', () => ({ loadRanking: vi.fn() }));
const load = vi.mocked(loadRanking);
beforeEach(() => {
  load.mockReset();
});
function httpError(status: number) {
  return new AxiosError('private server text', undefined, undefined, undefined, {
    status, statusText: 'private', data: { message: 'private server text' }, headers: {},
    config: { headers: new AxiosHeaders() },
  });
}
function run() { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar ranking' })); }
describe('Ranking screen', () => {
  it('keeps the labelled Cojeev scope selector disabled', () => {
    render(<Ranking />);
    const scope = screen.getByRole('combobox', { name: 'Alcance del análisis' });
    expect(scope).toHaveAttribute('data-slot', 'select-trigger');
    expect(scope).toBeDisabled();
    expect(scope).toHaveTextContent('Los 20 abstracts');
    fireEvent.keyDown(scope, { key: 'ArrowDown' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('stays idle until explicitly requested and blocks duplicate submissions', async () => {
    let resolve!: (value: ReturnType<typeof rankingSchema.parse>) => void;
    load.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<Ranking />);
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByText('Aún no se ha ejecutado el ranking.')).toBeVisible();
    run();
    await screen.findByRole('status', { name: 'Ejecutando el ranking…' });
    {
      const loading = screen.getByRole('status', { name: 'Ejecutando el ranking…' });
      expect(loading.querySelector('[data-slot="skeleton-item"]')).not.toBeNull();
      expect(loading.textContent).toBe('');
      expect(screen.queryByText('Ejecutando el ranking…')).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Ejecutar ranking' })).toBeDisabled();
    expect(screen.queryByRole('status', { name: 'Working' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ejecutar ranking' })).toHaveAttribute('aria-disabled', 'true');
    run(); expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(rankingSchema.parse(rankingFixture())); });
    expect(await screen.findAllByRole('table')).toHaveLength(3);
  });
  it('renders received order, Unicode, frequencies, parameters and exact Java timing', async () => {
    load.mockResolvedValue(rankingSchema.parse(rankingFixture()));
    render(<Ranking />); run();
    const tables = await screen.findAllByRole('table');
    expect(tables.map((table) => table.getAttribute('aria-label'))).toEqual(['Términos principales de Counting Sort', 'Términos principales de Radix Sort', 'Términos principales de Bucket Sort']);
    for (const table of tables) {
      expect(within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent)))
        .toEqual([['1', 'zeta', '9'], ['2', 'alpha', '9'], ['3', 'Ωμέγα', '2']]);
    }
    for (const text of ['all-20-abstracts', 'tokens-v1', 'interval-counting', '0.125 ms', '0.25 ms', '0.375 ms']) {
      expect(screen.getByText(text)).toBeVisible();
    }
    expect(screen.queryByText(/Los tiempos provienen/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alcance fijo/)).not.toBeInTheDocument();
    for (const [label, value] of [['Artículos', '20'], ['Total de tokens', '20'], ['Términos distintos', '3'], ['Frecuencia máxima', '9'], ['Base de Radix', '10'], ['Cantidad de buckets', '1'], ['Ancho de bucket', '10']]) {
      expect(screen.getByText(label!).parentElement).toHaveTextContent(value!);
    }
  });
  it.each([
    [httpError(400), 'Se rechazó la solicitud de ranking.'],
    [httpError(503), 'El ranking no está disponible.'],
    [httpError(500), 'El ranking falló en el servidor.'],
    [new AxiosError('private server text'), 'No se pudo conectar con el backend.'],
    [new ZodError([]), 'El backend devolvió una respuesta de ranking no válida.'],
  ])('shows a sanitized error %# and clears a previous success', async (error, message) => {
    load.mockResolvedValueOnce(rankingSchema.parse(rankingFixture())).mockRejectedValueOnce(error);
    render(<Ranking />); run(); await screen.findAllByRole('table'); run();
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/private server text/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ejecutar ranking' })).toBeEnabled();
  });
  it('aborts on unmount and ignores a late response', async () => {
    let resolve!: (value: ReturnType<typeof rankingSchema.parse>) => void;
    load.mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = render(<Ranking />); run();
    const signal = load.mock.calls[0]![0]!;
    view.unmount(); expect(signal.aborted).toBe(true);
    await act(async () => { resolve(rankingSchema.parse(rankingFixture())); });
    render(<Ranking />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Aún no se ha ejecutado el ranking.')).toBeVisible();
  });
});
