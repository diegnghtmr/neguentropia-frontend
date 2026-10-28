import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dendrogram } from './Dendrogram';

const labels = ['a', 'b', 'c', 'd'];
const labelWidth = 150;

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
