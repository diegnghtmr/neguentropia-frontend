import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { createApiClient, http } from '../../infrastructure/api/http';
import { forgetPapers, loadCatalog, loadDetail } from './client';
import { syntheticCatalog, syntheticDetail } from './fixtures.test-support';

const originalAdapter = http.defaults.adapter;
afterEach(() => {
  forgetPapers();
  if (originalAdapter === undefined) delete http.defaults.adapter;
  else http.defaults.adapter = originalAdapter;
});
function respond(data: unknown) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({ data, status: 200, statusText: 'OK', headers: {}, config }));
  http.defaults.adapter = adapter;
  return adapter;
}

describe('corpus HTTP client', () => {
  it('defaults to relative /api and supports a public backend origin', () => {
    expect(createApiClient().defaults.baseURL).toBe('/api');
    expect(createApiClient('http://127.0.0.1:8081/').defaults.baseURL).toBe('http://127.0.0.1:8081/api');
    expect(createApiClient('').defaults.baseURL).toBe('/api');
  });
  it('loads catalog through the validated boundary', async () => {
    respond({ ...syntheticCatalog(), papers: [] });
    await expect(loadCatalog()).rejects.toThrow();
  });
  it('requests the catalog once and reuses it for every view', async () => {
    const adapter = respond(syntheticCatalog());
    const [first, second] = await Promise.all([loadCatalog(), loadCatalog()]);
    expect(first).toEqual(syntheticCatalog());
    expect(await loadCatalog()).toBe(first);
    expect(second).toBe(first);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0]![0].url).toBe('/papers');
  });
  it('requests the catalog again after a failed attempt', async () => {
    const adapter = vi.fn<AxiosAdapter>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async (config) => ({ data: syntheticCatalog(), status: 200, statusText: 'OK', headers: {}, config }));
    http.defaults.adapter = adapter;
    await expect(loadCatalog()).rejects.toThrow('offline');
    expect(await loadCatalog()).toEqual(syntheticCatalog());
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it('downloads each abstract once and keeps forwarding cancellation', async () => {
    const adapter = respond(syntheticDetail('synthetic-1'));
    const signal = new AbortController().signal;
    const first = await loadDetail('synthetic-1', signal);
    expect(adapter.mock.calls[0]![0].signal).toBe(signal);
    expect(await loadDetail('synthetic-1')).toBe(first);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('encodes opaque IDs as a single path segment', async () => {
    const adapter = respond(syntheticDetail('opaque/id ?'));
    await loadDetail('opaque/id ?');
    expect(adapter.mock.calls[0]![0].url).toBe('/papers/opaque%2Fid%20%3F');
  });
  it.each([
    { id: 'synthetic-2' }, { originalAbstract: '' },
  ])('rejects incompatible detail %j', async (change) => {
    respond({ ...syntheticDetail(), ...change });
    await expect(loadDetail('synthetic-1')).rejects.toThrow();
  });
  it('does not replace a network failure with fixture data or retry', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('offline'));
    http.defaults.adapter = adapter;
    await expect(loadCatalog()).rejects.toThrow('offline');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
