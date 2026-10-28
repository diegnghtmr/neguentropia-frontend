import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dendrogram } from './Dendrogram';

const labels = ['a', 'b', 'c', 'd'];
const labelWidth = 84;

function mergeX(name: string, heights: [number, number, number]) {
  const merges = [
    { id: 4, leftId: 0, rightId: 1, height: heights[0], size: 2 },
    { id: 5, leftId: 2, rightId: 3, height: heights[1], size: 2 },
    { id: 6, leftId: 4, rightId: 5, height: heights[2], size: 4 },
  ];
  render(<Dendrogram name={name} merges={merges} leafLabels={labels} leafTitles={labels} />);
  const svg = screen.getByRole('img', { name: new RegExp(name) });
  return [4, 5, 6].map((id) => Number(svg.querySelector(`[data-merge="${id}"] line`)!.getAttribute('x1')) - labelWidth);
}

describe('Dendrogram axis', () => {
  it('places merges proportionally to the Java heights and equal heights at equal coordinates', () => {
    const [low, middle, root] = mergeX('Proportional', [0.1, 0.4, 0.9]);
    expect(middle! / low!).toBeCloseTo(4, 6);
    expect(root! / low!).toBeCloseTo(9, 6);
    const [firstTie, secondTie, rootTie] = mergeX('Tied', [0.4, 0.4, 0.9]);
    expect(firstTie).toBe(secondTie);
    expect(rootTie).toBeGreaterThan(firstTie!);
  });
});

describe('Dendrogram size', () => {
  it('scales to its container with readable labels instead of forcing a minimum width', () => {
    const merges = [{ id: 2, leftId: 0, rightId: 1, height: 0.5, size: 2 }];
    render(<Dendrogram name="Fit" merges={merges} leafLabels={['paper-1', 'paper-2']} leafTitles={['A', 'B']} />);
    const svg = screen.getByRole('img', { name: /Fit/ });
    expect(svg.style.minWidth).toBe('');
    expect(svg.getAttribute('width')).toBe('100%');
    const [, , width] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(width).toBeLessThanOrEqual(420);
    expect(Number(svg.querySelector('[data-leaf]')!.getAttribute('font-size')) * (320 / width!)).toBeGreaterThanOrEqual(10);
  });
});

describe('Dendrogram cut line', () => {
  const merges = [
    { id: 4, leftId: 0, rightId: 1, height: 0.1, size: 2 },
    { id: 5, leftId: 2, rightId: 3, height: 0.4, size: 2 },
    { id: 6, leftId: 4, rightId: 5, height: 0.9, size: 4 },
  ];
  it('draws a dashed cut line midway between the last applied merge and the next one', () => {
    render(<Dendrogram name="Cut" merges={merges} leafLabels={labels} leafTitles={labels} clusterCount={2} leafGroups={[0, 0, 1, 1]} />);
    const svg = screen.getByRole('img', { name: /Cut/ });
    const line = svg.querySelector('[data-cut] line')!;
    expect(Number(line.getAttribute('x1')) - labelWidth).toBeCloseTo((0.65 / 0.9) * 300, 6);
    expect(line.getAttribute('stroke-dasharray')).not.toBeNull();
    expect(svg.querySelector('[data-cut] text')).toHaveTextContent('corte');
  });
  it('fills each leaf pill with its group color', () => {
    render(<Dendrogram name="Colors" merges={merges} leafLabels={labels} leafTitles={labels} clusterCount={2} leafGroups={[0, 0, 1, 1]} />);
    const svg = screen.getByRole('img', { name: /Colors/ });
    const color = (id: number) => svg.querySelector(`[data-leaf-pill="${id}"]`)!.getAttribute('fill');
    expect(color(0)).toBe(color(1));
    expect(color(2)).toBe(color(3));
    expect(color(0)).not.toBe(color(2));
  });
  it('draws no cut line without a cluster count', () => {
    render(<Dendrogram name="Plain" merges={merges} leafLabels={labels} leafTitles={labels} />);
    expect(screen.getByRole('img', { name: /Plain/ }).querySelector('[data-cut]')).toBeNull();
  });
});

describe('Dendrogram group colors', () => {
  const merges = [
    { id: 4, leftId: 0, rightId: 1, height: 0.1, size: 2 },
    { id: 5, leftId: 2, rightId: 3, height: 0.4, size: 2 },
    { id: 6, leftId: 4, rightId: 5, height: 0.9, size: 4 },
  ];
  function drawn() {
    render(<Dendrogram name="Branches" merges={merges} leafLabels={labels} leafTitles={labels} clusterCount={2} leafGroups={[0, 0, 1, 1]} />);
    return screen.getByRole('img', { name: /Branches/ });
  }
  it('draws a merge inside one group thick in that group color', () => {
    const svg = drawn();
    const inside = svg.querySelector('[data-merge="4"]')!;
    const other = svg.querySelector('[data-merge="5"]')!;
    expect(inside.getAttribute('stroke')).toBe('var(--v-pink)');
    expect(other.getAttribute('stroke')).toBe('var(--v-blue)');
    expect(inside.getAttribute('stroke-width')).toBe('2.5');
  });
  it('draws a merge across groups thin and neutral', () => {
    const across = drawn().querySelector('[data-merge="6"]')!;
    expect(across.getAttribute('stroke')).toBe('var(--v-text-3)');
    expect(across.getAttribute('stroke-width')).toBe('1');
  });
  it('colors the leaf stubs and pills with the group color', () => {
    const svg = drawn();
    expect(svg.querySelector('[data-merge="5"] [data-stub="2"]')!.getAttribute('stroke')).toBe('var(--v-blue)');
    expect(svg.querySelector('[data-leaf-pill="0"]')!.getAttribute('fill')).toBe('var(--v-pink)');
    expect(svg.querySelector('[data-leaf="0"]')!.getAttribute('fill')).toBe('var(--v-on-accent)');
  });
});
