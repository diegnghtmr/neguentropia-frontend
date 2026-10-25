import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { ZodError } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ranking } from './Ranking';
import { loadRanking } from './client';
import { rankingSchema } from './schemas';
import { rankingFixture } from './fixtures.test-support';

vi.mock('./client', () => ({ loadRanking: vi.fn() }));
const load = vi.mocked(loadRanking);
beforeEach(() => {
  load.mockReset();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
  })));
});
afterEach(() => vi.unstubAllGlobals());
function httpError(status: number) {
  return new AxiosError('private server text', undefined, undefined, undefined, {
    status, statusText: 'private', data: { message: 'private server text' }, headers: {},
    config: { headers: new AxiosHeaders() },
  });
}
function run() { fireEvent.click(screen.getByRole('button', { name: 'Run ranking' })); }
describe('Ranking screen', () => {
  it('keeps the labelled Cojeev scope selector disabled', () => {
    render(<Ranking />);
    const scope = screen.getByRole('combobox', { name: 'Analysis scope' });
    expect(scope).toHaveAttribute('data-slot', 'select-trigger');
    expect(scope).toBeDisabled();
    expect(scope).toHaveTextContent('All 20 abstracts');
    fireEvent.keyDown(scope, { key: 'ArrowDown' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('stays idle until explicitly requested and blocks duplicate submissions', async () => {
    let resolve!: (value: ReturnType<typeof rankingSchema.parse>) => void;
    load.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<Ranking />);
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByText('No ranking has been run.')).toBeVisible();
    run();
    expect(screen.getByRole('status', { name: 'Running ranking…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run ranking' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Run ranking' })).toHaveAttribute('aria-disabled', 'true');
    run(); expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(rankingSchema.parse(rankingFixture())); });
    expect(screen.getAllByRole('table')).toHaveLength(3);
  });
  it('renders received order, Unicode, frequencies, parameters and exact Java timing', async () => {
    load.mockResolvedValue(rankingSchema.parse(rankingFixture()));
    render(<Ranking />); run();
    const tables = await screen.findAllByRole('table');
    expect(tables.map((table) => table.getAttribute('aria-label'))).toEqual(['Counting Sort top terms', 'Radix Sort top terms', 'Bucket Sort top terms']);
    for (const table of tables) {
      expect(within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent)))
        .toEqual([['1', 'zeta', '9'], ['2', 'alpha', '9'], ['3', 'Ωμέγα', '2']]);
    }
    for (const text of ['all-20-abstracts', 'tokens-v1', 'interval-counting', '0.125 ms', '0.25 ms', '0.375 ms']) {
      expect(screen.getByText(text)).toBeVisible();
    }
    expect(screen.getByText(/Java single-run timing; not a benchmark/)).toBeVisible();
    for (const [label, value] of [['Papers', '20'], ['Total tokens', '20'], ['Distinct terms', '3'], ['Max frequency', '9'], ['Radix base', '10'], ['Bucket count', '1'], ['Bucket width', '10']]) {
      expect(screen.getByText(label!).parentElement).toHaveTextContent(value!);
    }
  });
  it.each([
    [httpError(400), 'Ranking request was rejected.'],
    [httpError(503), 'Ranking is unavailable.'],
    [httpError(500), 'Ranking failed on the server.'],
    [new AxiosError('private server text'), 'Could not connect to the backend.'],
    [new ZodError([]), 'The backend returned an invalid ranking response.'],
  ])('shows a sanitized error %# and clears a previous success', async (error, message) => {
    load.mockResolvedValueOnce(rankingSchema.parse(rankingFixture())).mockRejectedValueOnce(error);
    render(<Ranking />); run(); await screen.findAllByRole('table'); run();
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/private server text/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run ranking' })).toBeEnabled();
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
    expect(screen.getByText('No ranking has been run.')).toBeVisible();
  });
});
