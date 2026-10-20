import { describe, expect, it } from 'vitest';
import { path, rim, spring, type Point } from './geometry';
import { createBody, stepBody } from './body';
import { factoryCfg, factoryTiers } from './settings';
import { fromShape } from './shapes';

describe('retained Cojeev geometry under strict indexed access', () => {
  it('produces dense five-coordinate rims and finite closed paths', () => {
    const outline = rim(240, 48, 8, 2.5);
    expect(outline.length).toBeGreaterThanOrEqual(64);
    expect(outline.length).toBeLessThanOrEqual(320);
    expect(outline.per).toBeCloseTo(2 * 224 + 2 * 32 + 16 * Math.PI);
    expect(outline.every(point => point.length === 5 && point.every(Number.isFinite))).toBe(true);
    const points = outline.map(([x, y]): Point => [x, y]);
    for (const poly of [false, true]) {
      expect(path(points, poly)).toMatch(/^M.*Z$/);
      expect(path(points, poly)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('preserves finite settled-body output with reduced motion', () => {
    const body = createBody(factoryTiers.pill, 'pill', 1);
    body.w = 240;
    body.h = 48;
    body.R = { left: 0, top: 0, right: 240, bottom: 48, width: 240, height: 48 };
    body.base = rim(body.w, body.h, 8, 2.5);
    const frame = stepBody(body, { x: -10000, y: -10000 }, 0, 0, factoryCfg, true);
    expect(frame.active).toBe(false);
    expect(frame.points).toHaveLength(body.base.length);
    expect(frame.points.every(point => point.every(Number.isFinite))).toBe(true);
  });
  it('keeps the authored spring integrator finite and settled at its target', () => {
    const value = { x: 0, v: 0, to: 1, k: 120, z: 1 };
    for (let i = 0; i < 300; i++) spring(value, .016);
    expect(value.x).toBe(1);
    expect(value.v).toBe(0);
  });
  it('rejects an unknown shape before attempting DOM geometry', () => {
    expect(() => fromShape('not-a-cojeev-shape', 100, 100, 2.5)).toThrow('Unknown Cojeev shape');
  });
});
