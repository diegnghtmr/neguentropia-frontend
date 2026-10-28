import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '../../infrastructure/api/http';
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
const run = () => fireEvent.click(screen.getByRole('button', { name: 'Run clustering' }));
async function choose(count: string) {
  const trigger = screen.getByRole('combobox', { name: 'Number of clusters' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: count });
  option.focus();
  fireEvent.keyDown(option, { key: 'Enter' });
}
describe('Clustering screen', () => {
  it('starts empty with two clusters selected and the 2 to 19 range', async () => {
    render(<Clustering />);
    expect(screen.getByText('No clustering has been run.')).toBeVisible();
    const trigger = screen.getByRole('combobox', { name: 'Number of clusters' });
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
      expect.stringContaining('Single linkage dendrogram'),
      expect.stringContaining('Complete linkage dendrogram'),
      expect.stringContaining('Average linkage dendrogram'),
    ]);
    for (const image of images) {
      expect(image.querySelectorAll('[data-leaf]')).toHaveLength(20);
      expect(image.querySelectorAll('[data-merge]')).toHaveLength(19);
    }
    for (const value of ['0.1234', '0.4321', '0.2222']) {
      expect(screen.getByText(`Silhouette ${value}`)).toBeVisible();
    }
  });
  it('marks the method with the highest silhouette as the most coherent', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    expect(screen.getByText('Most coherent: Complete linkage')).toBeVisible();
    expect(screen.getAllByText('Most coherent')).toHaveLength(1);
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
    expect(screen.getByText(/tied/)).toBeVisible();
    expect(screen.queryByText(/Most coherent:/)).not.toBeInTheDocument();
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
    expect(screen.getByText('Most coherent: Single linkage and Average linkage')).toBeVisible();
    expect(screen.getAllByText('Most coherent')).toHaveLength(2);
    expect(screen.queryByText(/no method is more coherent/)).not.toBeInTheDocument();
  });
  it('shows the groups with titles from the catalog and the merge heights as text', async () => {
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = await screen.findAllByRole('list', { name: 'Complete linkage groups' });
    expect(within(groups[0]!).getAllByRole('listitem')).toHaveLength(2);
    expect(await within(groups[0]!).findByText('Group 2: Paper 17, Paper 18, Paper 19, Paper 20')).toBeVisible();
    expect(screen.getByText('Merge 38: Merge 37 and Merge 34 at height 0.7700')).toBeInTheDocument();
  });
  it('falls back to paper ids when the catalog is unavailable', async () => {
    catalogAvailable = false;
    render(<Clustering />);
    run();
    await screen.findAllByRole('img');
    const groups = screen.getAllByRole('list', { name: 'Single linkage groups' });
    expect(groups[0]).toHaveTextContent('Group 2: paper-17, paper-18, paper-19, paper-20');
  });
  it('shows the API error code and message and no stale result', async () => {
    post.mockImplementation(async (config) => { throw new AxiosError('failed', undefined, config, undefined, { data: { code: 'CORPUS_UNAVAILABLE', message: 'Corpus is not ready.' }, status: 503, statusText: 'Unavailable', headers: {}, config }); });
    render(<Clustering />);
    run();
    expect(await screen.findByRole('alert')).toHaveTextContent('CORPUS_UNAVAILABLE: Corpus is not ready.');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
  it('shows a loading state and prevents double submission', async () => {
    let release!: () => void;
    post.mockImplementation((config) => new Promise((resolve) => { release = () => resolve({ data: clusteringFixture(), status: 200, statusText: 'OK', headers: {}, config }); }));
    render(<Clustering />);
    run();
    expect(await screen.findByRole('status', { name: 'Running clustering' })).toBeVisible();
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
    expect(screen.getByText('No clustering has been run.')).toBeVisible();
  });
});
