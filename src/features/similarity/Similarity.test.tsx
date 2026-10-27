import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
import { Similarity } from './Similarity';
import { catalogFixture, similarityFixture } from './fixtures.test-support';

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
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Run similarity' }));
const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
async function selectPair() {
  await screen.findByRole('checkbox', { name: 'Paper 1' });
  check('Paper 2'); check('Paper 1');
}
describe('Similarity screen', () => {
  it('requires two papers and at least one method and sends manifest and requested order', async () => {
    render(<Similarity />);
    const button = screen.getByRole('button', { name: 'Run similarity' });
    expect(button).toBeDisabled();
    await screen.findByRole('checkbox', { name: 'Paper 1' });
    check('Paper 2'); expect(button).toBeDisabled();
    check('Paper 1'); expect(button).toBeEnabled();
    for (const method of ['Levenshtein', 'LCS', 'TF-IDF cosine', 'Jaccard']) check(method);
    expect(button).toBeDisabled();
    check('Jaccard'); check('LCS');
    const f = similarityFixture();
    post.mockImplementation(async (config) => ({ data: { ...f, methods: ['lcs', 'jaccard'], pairs: f.pairs.map((p) => ({ ...p, results: p.results.filter((r) => ['lcs', 'jaccard'].includes(r.method)) })) }, status: 200, statusText: 'OK', headers: {}, config }));
    run(); await screen.findByRole('table');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({ paperIds: ['paper-1', 'paper-2'], methods: ['lcs', 'jaccard'] });
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('renders pair titles, ordered rows, scores, explanations and Java timing', async () => {
    render(<Similarity />); await selectPair(); run();
    const table = await screen.findByRole('table', { name: 'Paper 1 vs Paper 2' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.textContent)).toEqual(['Levenshtein', 'LCS', 'TF-IDF cosine', 'Jaccard']);
    for (const text of ['0.5000', '0.6667', '0.6694', '0.3333', '0.125', '0.25', '0.375']) expect(within(table).getByText(text)).toBeVisible();
    expect(rows[0]).toHaveTextContent('Distance: 1');
    expect(rows[0]).toHaveTextContent('Left code points: 2');
    expect(rows[1]).toHaveTextContent('Length: 2');
    expect(rows[1]).toHaveTextContent('Left tokens: 3');
    expect(rows[2]).toHaveTextContent('Dimension: 4');
    expect(rows[3]).toHaveTextContent('Intersection: 1');
    expect(rows[3]).toHaveTextContent('Union: 3');
  });
  it('renders every received pair for three selected papers', async () => {
    const f = similarityFixture();
    post.mockImplementation(async (config) => ({ data: { ...f, paperIds: ['paper-1', 'paper-2', 'paper-3'], pairs: [
      f.pairs[0]!, { ...f.pairs[0]!, left: 'paper-1', right: 'paper-3' }, { ...f.pairs[0]!, left: 'paper-2', right: 'paper-3' },
    ] }, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Similarity />); await selectPair(); check('Paper 3'); run();
    expect((await screen.findAllByRole('table')).map((table) => table.getAttribute('aria-label'))).toEqual([
      'Paper 1 vs Paper 2', 'Paper 1 vs Paper 3', 'Paper 2 vs Paper 3',
    ]);
  });
  it.each(['Paper 1', 'Jaccard'])('clears the previous result when %s changes', async (name) => {
    render(<Similarity />); await selectPair(); run(); await screen.findByRole('table');
    check(name); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('shows the API message without retaining a prior result', async () => {
    render(<Similarity />); await selectPair(); run(); await screen.findByRole('table');
    post.mockImplementation(async (config) => { throw new AxiosError('Request failed', undefined, config, undefined, { data: { code: 'CORPUS_UNAVAILABLE', message: 'The paper corpus is unavailable.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    run(); expect(await screen.findByRole('alert')).toHaveTextContent('The paper corpus is unavailable.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('blocks duplicate runs and discards a response after selection changes', async () => {
    let resolve!: (value: Awaited<ReturnType<AxiosAdapter>>) => void;
    post.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<Similarity />); await selectPair(); run(); run();
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: 'Running similarity' })).toBeVisible();
    const config = post.mock.calls[0]![0];
    check('Paper 1');
    expect(config.signal?.aborted).toBe(true);
    await act(async () => { resolve({ data: similarityFixture(), status: 200, statusText: 'OK', headers: {}, config }); });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
