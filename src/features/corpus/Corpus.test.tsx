import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { Corpus } from './Corpus';
import { loadCatalog, loadDetail } from './client';
import { syntheticCatalog, syntheticDetail } from './fixtures.test-support';

vi.mock('./client', () => ({ loadCatalog: vi.fn(), loadDetail: vi.fn() }));
const catalogRequest = vi.mocked(loadCatalog);
const detailRequest = vi.mocked(loadDetail);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function openSelection() {
  const trigger = await screen.findByRole('combobox', { name: 'Paper' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  return screen.findByRole('listbox');
}
async function select(id = 'synthetic-1') {
  await openSelection();
  const title = syntheticCatalog().papers.find((paper) => paper.id === id)!.title;
  const option = await screen.findByRole('option', { name: title });
  option.focus();
  fireEvent.keyDown(option, { key: 'Enter' });
}
beforeEach(() => {
  vi.resetAllMocks();
  // jsdom has no media-query implementation; exercise real component hooks with a static browser preference.
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
  })));
  catalogRequest.mockResolvedValue(syntheticCatalog());
  detailRequest.mockImplementation(async (id) => syntheticDetail(id));
});

afterEach(() => vi.unstubAllGlobals());

describe('Corpus screen', () => {
  it('announces loading before showing an ordered, complete catalog', async () => {
    const request = deferred<ReturnType<typeof syntheticCatalog>>();
    catalogRequest.mockReturnValue(request.promise);
    render(<Corpus />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading corpus');
    expect(screen.getByRole('status')).toHaveAttribute('data-slot', 'alert');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await act(async () => { request.resolve(syntheticCatalog()); });
    expect(screen.queryByText(/Corpus version/)).not.toBeInTheDocument();
    await openSelection();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(20);
    expect(options.map((option) => option.textContent)).toEqual(syntheticCatalog().papers.map((paper) => paper.title));
    expect(detailRequest).not.toHaveBeenCalled();
  });
  it('renders the reader with a labelled Cojeev Select and keyboard selection', async () => {
    const { container } = render(<Corpus />);
    const selection = await screen.findByRole('combobox', { name: 'Paper' });
    selection.focus();
    expect(selection).toHaveFocus();
    expect(selection.tagName).toBe('BUTTON');
    expect(selection).toHaveAttribute('data-slot', 'select-trigger');
    expect(selection).toHaveTextContent('Choose a paper');
    expect(screen.getByText(/Corpus ready/)).toHaveAttribute('data-slot', 'badge');
    await select();
    const abstract = await screen.findByTestId('original-abstract');
    expect(abstract.closest('[data-slot="card-content"]')).not.toBeNull();
    expect(selection).toHaveTextContent(syntheticCatalog().papers[0]!.title);
    expect(container.querySelector('svg.v-morph')).toBeNull();
    expect(screen.getByRole('heading', { name: syntheticDetail().title }).closest('[data-slot="card"]')).not.toBeNull();

  });
  it('uses an inline Cojeev alert for sanitized failure, not a dismissible notification', async () => {
    catalogRequest.mockRejectedValue(new Error('/private/path secret'));
    render(<Corpus />);
    expect(await screen.findByRole('alert')).toHaveAttribute('data-slot', 'alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load corpus');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/private\/path/)).not.toBeInTheDocument();
  });
  it('shows authors and exact original text without interpreting HTML', async () => {
    const { container } = render(<Corpus />);
    await select();
    const text = await screen.findByTestId('original-abstract');
    expect(text.textContent).toBe(syntheticDetail().originalAbstract);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByText(/SHA-256/)).not.toBeInTheDocument();
    expect(screen.getByText('Synthetic Author')).toBeVisible();
    expect(screen.getByRole('article').querySelector('p')).toHaveTextContent('Synthetic Author');
    expect(screen.getByRole('heading', { name: syntheticDetail().title, level: 3 })).toHaveAttribute('id', 'paper-title');
  });
  it('distinguishes corpus unavailable from a generic catalog failure', async () => {
    catalogRequest.mockRejectedValue(new AxiosError('503', undefined, undefined, undefined, {
      data: { code: 'CORPUS_UNAVAILABLE', message: 'Corpus unavailable.' }, status: 503, statusText: 'Unavailable', headers: {}, config: { headers: {} } as never,
    }));
    render(<Corpus />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Corpus is unavailable');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it('reports a sanitized catalog failure without fallback data', async () => {
    catalogRequest.mockRejectedValue(new Error('/private/path secret'));
    render(<Corpus />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load corpus');
    expect(screen.queryByText(/private\/path/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it('clears stale detail on selection, ignores out-of-order success and handles detail error', async () => {
    const second = deferred<ReturnType<typeof syntheticDetail>>();
    const third = deferred<ReturnType<typeof syntheticDetail>>();
    detailRequest.mockImplementation((id) => id === 'synthetic-2' ? second.promise : id === 'synthetic-3' ? third.promise : Promise.resolve(syntheticDetail(id)));
    render(<Corpus />);
    await select();
    await screen.findByTestId('original-abstract');
    await select('synthetic-2');
    expect(screen.queryByTestId('original-abstract')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading abstract');
    await select('synthetic-3');
    await act(async () => { third.reject(new Error('unavailable')); });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load abstract');
    await act(async () => { second.resolve(syntheticDetail('synthetic-2')); });
    expect(screen.queryByTestId('original-abstract')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('ignores stale errors after another paper is selected', async () => {
    const first = deferred<ReturnType<typeof syntheticDetail>>();
    detailRequest.mockImplementation((id) => id === 'synthetic-1' ? first.promise : Promise.resolve(syntheticDetail(id)));
    render(<Corpus />);
    await select();
    await select('synthetic-2');
    await screen.findByTestId('original-abstract');
    await act(async () => { first.reject(new Error('stale failure')); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: syntheticDetail('synthetic-2').title })).toBeVisible();
  });
  it('aborts in-flight catalog on unmount', () => {
    catalogRequest.mockReturnValue(new Promise(() => {}));
    const view = render(<Corpus />);
    const signal = catalogRequest.mock.calls[0]![0];
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
