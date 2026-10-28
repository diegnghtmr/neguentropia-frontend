import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { http } from '../../infrastructure/api/http';
import { searchPapers } from './client';
import { searchFixture } from './fixtures.test-support';

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
describe('search HTTP client', () => {
  it('posts the pattern and the methods and forwards cancellation', async () => {
    const adapter = respond(searchFixture());
    const signal = new AbortController().signal;
    const request = { pattern: 'aba', methods: ['kmp', 'boyer-moore', 'rabin-karp'] } as const;
    expect(await searchPapers(request, signal)).toEqual(searchFixture());
    expect(adapter.mock.calls[0]![0]).toMatchObject({ url: '/search', method: 'post', data: JSON.stringify({ pattern: 'aba', methods: ['kmp', 'boyer-moore', 'rabin-karp'] }), signal });
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('rejects an incompatible response', async () => {
    respond({ ...searchFixture(), extra: true });
    await expect(searchPapers({ pattern: 'aba', methods: ['kmp'] })).rejects.toThrow();
  });
});
