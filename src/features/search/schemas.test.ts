import { describe, expect, it } from 'vitest';
import { apiErrorSchema, searchSchema } from './schemas';
import { searchFixture } from './fixtures.test-support';

describe('search schema', () => {
  it('accepts a valid response', () => {
    expect(searchSchema.parse(searchFixture())).toEqual(searchFixture());
  });
  it('rejects extra fields at every level', () => {
    expect(() => searchSchema.parse({ ...searchFixture(), extra: 1 })).toThrow();
    const result = searchFixture();
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, extra: 1 }] })).toThrow();
    const paper = { ...result.results[0]!.papers[0]!, extra: 1 };
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, papers: [paper, ...result.results[0]!.papers.slice(1)] }] })).toThrow();
  });
  it('rejects ranges outside the contract', () => {
    const result = searchFixture();
    expect(() => searchSchema.parse({ ...result, pattern: '' })).toThrow();
    expect(() => searchSchema.parse({ ...result, results: [] })).toThrow();
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, searchMilliseconds: -1 }] })).toThrow();
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, method: 'naive' }] })).toThrow();
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, papers: result.results[0]!.papers.slice(1) }] })).toThrow();
    const negative = [{ paperId: 'paper-1', positions: [-1] }, ...result.results[0]!.papers.slice(1)];
    expect(() => searchSchema.parse({ ...result, results: [{ ...result.results[0]!, papers: negative }] })).toThrow();
  });
  it('validates API errors', () => {
    expect(apiErrorSchema.parse({ code: 'INVALID_INPUT', message: 'Bad' })).toEqual({ code: 'INVALID_INPUT', message: 'Bad' });
    expect(() => apiErrorSchema.parse({ code: 'INVALID_INPUT', message: 'Bad', extra: 1 })).toThrow();
  });
});
