import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { clusteringSchema } from './schemas';
import { SilhouetteCuts } from './SilhouetteCuts';
import { clusteringFixture } from './fixtures.test-support';

function renderCuts(clusterCount: number, edit?: (results: ReturnType<typeof clusteringFixture>['results']) => void) {
  const fixture = clusteringFixture();
  edit?.(fixture.results);
  return render(<SilhouetteCuts results={clusteringSchema.parse(fixture).results} clusterCount={clusterCount} />);
}

describe('Silueta por corte', () => {
  it('shows a titled card with an accessible chart of the three criteria', () => {
    renderCuts(2);
    expect(screen.getByText('Silueta por corte')).toBeVisible();
    const chart = screen.getByRole('graphics-document');
    expect(chart).toHaveAccessibleName(/Silueta por corte/);
    expect(chart.querySelector('desc')).toHaveTextContent(/k de 2 a 19/);
    expect(chart.querySelectorAll('[data-line]')).toHaveLength(3);
    expect(chart.querySelectorAll('[data-point]')).toHaveLength(54);
    for (const name of ['Single', 'Complete', 'Average']) {
      expect(within(screen.getByRole('list', { name: 'Leyenda' })).getByText(name)).toBeVisible();
    }
  });
  it('labels the axes with ticks and marks the selected cut', () => {
    renderCuts(7);
    const chart = screen.getByRole('graphics-document');
    const xLabels = Array.from(chart.querySelectorAll('[data-x-tick]')).map((tick) => tick.textContent);
    expect(xLabels).toEqual(Array.from({ length: 18 }, (_, i) => String(i + 2)));
    expect(chart.querySelectorAll('[data-y-tick]').length).toBeGreaterThanOrEqual(4);
    const cut = chart.querySelector('[data-cut]');
    expect(cut).toHaveAttribute('data-cut', '7');
    expect(cut).toHaveTextContent('corte');
  });
  it('lists every cut with six decimals and the row maximum in bold', () => {
    renderCuts(2);
    const table = screen.getByRole('table', { name: 'Silueta para todos los cortes' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['k', 'Single', 'Complete', 'Average']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(18);
    expect(within(rows[0]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '0.123400', '0.432100', '0.222200']);
    expect(within(rows[17]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['19', '-0.046600', '0.262100', '0.052200']);
    const bold = within(rows[0]!).getAllByRole('cell').map((cell) => cell.querySelector('strong') !== null);
    expect(bold).toEqual([false, false, true, false]);
  });
  it('bolds every value tied for the row maximum', () => {
    renderCuts(2, (results) => {
      results[0]!.silhouettesByCut[0]!.silhouette = 0.024655;
      results[1]!.silhouettesByCut[0]!.silhouette = 0.017238;
      results[2]!.silhouettesByCut[0]!.silhouette = 0.024655;
      for (const result of results) {
        result.silhouettesByCut[1]!.silhouette = 0.005210;
      }
    });
    const rows = within(screen.getByRole('table', { name: 'Silueta para todos los cortes' })).getAllByRole('row').slice(1);
    const boldOf = (row: HTMLElement) => within(row).getAllByRole('cell').slice(1).map((cell) => cell.querySelector('strong') !== null);
    expect(boldOf(rows[0]!)).toEqual([true, false, true]);
    expect(boldOf(rows[1]!)).toEqual([true, true, true]);
  });
  it('agrees with the silhouette of the chosen cut', () => {
    const fixture = clusteringSchema.parse(clusteringFixture());
    render(<SilhouetteCuts results={fixture.results} clusterCount={2} />);
    const first = within(screen.getByRole('table', { name: 'Silueta para todos los cortes' })).getAllByRole('row')[1]!;
    expect(within(first).getAllByRole('cell').slice(1).map((cell) => cell.textContent)).toEqual(fixture.results.map((result) => result.silhouette.toFixed(6)));
  });
});
