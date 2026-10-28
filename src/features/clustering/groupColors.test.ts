import { describe, expect, it } from 'vitest';
import { groupColor, pillInk } from './groupColors';

describe('group colors', () => {
  it('gives the first five groups five different colors', () => {
    const colors = [0, 1, 2, 3, 4].map(groupColor);
    expect(new Set(colors).size).toBe(5);
    expect(colors[4]).toBe('var(--v-ink)');
  });
  it('uses light text on the dark group and dark text on the light ones', () => {
    expect(pillInk(4)).toBe('var(--v-on-ink)');
    expect(pillInk(0)).toBe('var(--v-on-accent)');
  });
});
