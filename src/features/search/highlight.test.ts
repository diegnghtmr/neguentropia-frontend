import { describe, expect, it } from 'vitest';
import { highlightSegments } from './highlight';

describe('highlightSegments', () => {
  it('returns the whole text when there are no matches', () => {
    expect(highlightSegments('hello', [], 2)).toEqual([{ text: 'hello', match: false }]);
  });
  it('splits text around separate matches', () => {
    expect(highlightSegments('abcabc', [0, 3], 2)).toEqual([
      { text: 'ab', match: true },
      { text: 'c', match: false },
      { text: 'ab', match: true },
      { text: 'c', match: false },
    ]);
  });
  it('merges overlapping matches into one range', () => {
    expect(highlightSegments('xababa', [1, 3], 3)).toEqual([
      { text: 'x', match: false },
      { text: 'ababa', match: true },
    ]);
  });
  it('keeps adjacent matches apart and the reconstructed text intact', () => {
    const segments = highlightSegments('aaaa tail', [0, 2], 2);
    expect(segments).toEqual([{ text: 'aa', match: true }, { text: 'aa', match: true }, { text: ' tail', match: false }]);
    expect(segments.map((segment) => segment.text).join('')).toBe('aaaa tail');
  });
});
