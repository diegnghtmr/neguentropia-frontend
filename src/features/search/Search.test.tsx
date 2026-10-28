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
const input = () => screen.getByRole('textbox', { name: 'Pattern' });
const action = () => screen.getByRole('button', { name: 'Search' });
function search(pattern = 'aba') {
  fireEvent.change(input(), { target: { value: pattern } });
  fireEvent.click(action());
}
describe('Search screen', () => {
  it('disables the action while the pattern is empty', () => {
    render(<Search />);
    expect(action()).toBeDisabled();
    fireEvent.change(input(), { target: { value: 'a' } });
    expect(action()).toBeEnabled();
  });
  it('sends the pattern with the three methods', async () => {
    render(<Search />);
    search();
    await screen.findByText('Total matches: 3');
    expect(JSON.parse(post.mock.calls[0]![0].data as string)).toEqual({ pattern: 'aba', methods: ['kmp', 'boyer-moore', 'rabin-karp'] });
  });
  it('shows the timings table, agreement line and papers with highlighted matches', async () => {
    render(<Search />);
    search();
    await screen.findByText('Total matches: 3');
    const table = screen.getByRole('table', { name: 'Search timings' });
    const rows = within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['KMP', '0.0123', '0.4500'],
      ['Boyer-Moore', '0.0234', '0.3500'],
      ['Rabin-Karp', '0.0345', '0.5500'],
    ]);
    expect(screen.getByText('All three methods returned the same positions.')).toBeVisible();
    const first = await screen.findByRole('article', { name: 'Paper 2' });
    expect(within(first).getByText('2 matches')).toBeVisible();
    const marks = within(first).getAllByText((_, element) => element?.tagName === 'MARK');
    expect(marks.map((mark) => mark.textContent)).toEqual(['ababa']);
    expect(first.textContent).toContain('xababa tail 2');
    const second = screen.getByRole('article', { name: 'Paper 5' });
    expect(within(second).getByText('1 match')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
  it('reports when the methods disagree', async () => {
    const data = searchFixture();
    data.results[1]!.papers[1]!.positions = [1];
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search();
    expect(await screen.findByText('The methods returned different positions.')).toBeVisible();
  });
  it('falls back to the paper id when the catalog is unavailable', async () => {
    catalogAvailable = false;
    const data = searchFixture();
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search();
    expect(await screen.findByRole('article', { name: 'paper-2' })).toBeVisible();
  });
  it('shows an empty state when nothing matches', async () => {
    const data = searchFixture();
    for (const result of data.results) {
      result.papers = result.papers.map((paper) => ({ paperId: paper.paperId, positions: [] }));
    }
    post.mockImplementation(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
    render(<Search />);
    search('zzz');
    expect(await screen.findByText('No matches')).toBeVisible();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('shows the API error code and message', async () => {
    post.mockImplementation(async (config) => {
      throw new AxiosError('bad', 'ERR_BAD_REQUEST', config, undefined, {
        data: { code: 'INVALID_INPUT', message: 'Pattern must not be empty.' }, status: 400, statusText: 'Bad Request', headers: {}, config,
      });
    });
    render(<Search />);
    search();
    expect(await screen.findByRole('alert')).toHaveTextContent('INVALID_INPUT: Pattern must not be empty.');
  });
});
