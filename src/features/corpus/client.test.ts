import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { createApiClient, http } from '../../infrastructure/api/http';
import { loadCatalog, loadDetail } from './client';
import { syntheticCatalog, syntheticDetail } from './fixtures.test-support';

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
  it('preserves catalog order and forwards cancellation', async () => {
    const adapter = respond(syntheticCatalog());
    const signal = new AbortController().signal;
    expect(await loadCatalog(signal)).toEqual(syntheticCatalog());
    expect(adapter.mock.calls[0]![0].url).toBe('/papers');
    expect(adapter.mock.calls[0]![0].signal).toBe(signal);
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
