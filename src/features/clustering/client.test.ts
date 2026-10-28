import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { http } from '../../infrastructure/api/http';
import { loadClustering } from './client';
import { clusteringFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
function respond(data: unknown) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = adapter;
  return adapter;
}
describe('clustering HTTP client', () => {
  it('posts only the cluster count and forwards cancellation', async () => {
    const adapter = respond(clusteringFixture());
    const signal = new AbortController().signal;
    expect(await loadClustering({ clusterCount: 5 }, signal)).toEqual(clusteringFixture());
    expect(adapter.mock.calls[0]![0]).toMatchObject({ url: '/clustering', method: 'post', data: JSON.stringify({ clusterCount: 5 }), signal });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('rejects an incompatible response', async () => {
    respond({ ...clusteringFixture(), extra: true });
    await expect(loadClustering({ clusterCount: 2 })).rejects.toThrow();
  });
  it('propagates network failures without retrying', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('offline'));
    http.defaults.adapter = adapter;
    await expect(loadClustering({ clusterCount: 2 })).rejects.toThrow('offline');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
