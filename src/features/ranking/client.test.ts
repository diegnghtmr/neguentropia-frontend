import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { http } from '../../infrastructure/api/http';
import { loadRanking } from './client';
import { rankingFixture } from './fixtures.test-support';

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
describe('ranking HTTP client', () => {
  it('POSTs only an empty object through the shared client and forwards the signal', async () => {
    const adapter = respond(rankingFixture());
    const signal = new AbortController().signal;
    expect(await loadRanking(signal)).toEqual(rankingFixture());
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0]![0]).toMatchObject({ url: '/ranking', method: 'post', data: '{}', signal });
  });
  it('supports a request without an optional signal', async () => {
    respond(rankingFixture());
    expect(await loadRanking()).toEqual(rankingFixture());
  });
  it('honors an already aborted signal without sending a request', async () => {
    const adapter = respond(rankingFixture());
    const controller = new AbortController(); controller.abort();
    await expect(loadRanking(controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
  });
  it('rejects invalid data rather than displaying partial results', async () => {
    respond({ ...rankingFixture(), results: [] });
    await expect(loadRanking()).rejects.toThrow();
  });
  it('propagates network failure without retries or fallback', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('offline'));
    http.defaults.adapter = adapter;
    await expect(loadRanking()).rejects.toThrow('offline');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
