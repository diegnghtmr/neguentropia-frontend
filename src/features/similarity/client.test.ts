import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { http } from '../../infrastructure/api/http';
import { loadSimilarity } from './client';
import { classicalMethods } from './schemas';
import { similarityFixture } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
const request = { paperIds: ['paper-1', 'paper-2'], methods: [...classicalMethods] };
afterEach(() => {
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
function respond(data: unknown) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = adapter;
  return adapter;
}
describe('similarity HTTP client', () => {
  it('posts only the selected IDs and methods and forwards cancellation', async () => {
    const adapter = respond(similarityFixture());
    const signal = new AbortController().signal;
    expect(await loadSimilarity(request, signal)).toEqual(similarityFixture());
    expect(adapter.mock.calls[0]![0]).toMatchObject({ url: '/similarity', method: 'post', data: JSON.stringify(request), signal });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('supports requests without a signal', async () => {
    respond(similarityFixture());
    expect(await loadSimilarity(request)).toEqual(similarityFixture());
  });
  it('honors a previously aborted signal', async () => {
    const adapter = respond(similarityFixture());
    const controller = new AbortController(); controller.abort();
    await expect(loadSimilarity(request, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
  });
  it('propagates network failures without retrying', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('offline'));
    http.defaults.adapter = adapter;
    await expect(loadSimilarity(request)).rejects.toThrow('offline');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
