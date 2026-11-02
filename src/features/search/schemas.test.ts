import { describe, expect, it } from 'vitest';
import { apiErrorSchema, searchSchema, searchStepsSchema } from './schemas';
import { searchFixture, stepsFixture } from './fixtures.test-support';

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
  it('accepts a valid steps response and rejects extra fields at every level', () => {
    expect(searchStepsSchema.parse(stepsFixture())).toEqual(stepsFixture());
    expect(() => searchStepsSchema.parse({ ...stepsFixture(), extra: 1 })).toThrow();
    const steps = stepsFixture();
    expect(() => searchStepsSchema.parse({ ...steps, kmp: { ...steps.kmp, steps: [{ ...steps.kmp.steps[0]!, extra: 1 }] } })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, boyerMoore: { ...steps.boyerMoore, lastOccurrences: [{ character: 'a', index: 2, extra: 1 }] } })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, rabinKarp: { ...steps.rabinKarp, windows: [{ ...steps.rabinKarp.windows[0]!, extra: 1 }] } })).toThrow();
  });
  it('rejects steps outside the contract ranges', () => {
    const steps = stepsFixture();
    expect(() => searchStepsSchema.parse({ ...steps, fragmentStart: -1 })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, positions: [-1] })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, rabinKarp: { ...steps.rabinKarp, base: 255 } })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, rabinKarp: { ...steps.rabinKarp, modulus: 7 } })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, boyerMoore: { ...steps.boyerMoore, steps: [{ ...steps.boyerMoore.steps[0]!, shift: 0 }] } })).toThrow();
    expect(() => searchStepsSchema.parse({ ...steps, boyerMoore: { ...steps.boyerMoore, steps: [{ ...steps.boyerMoore.steps[0]!, mismatchIndex: -2 }] } })).toThrow();
  });
  it('accepts the paper-not-found error', () => {
    expect(apiErrorSchema.parse({ code: 'PAPER_NOT_FOUND', message: 'Missing' }).code).toBe('PAPER_NOT_FOUND');
  });
});
