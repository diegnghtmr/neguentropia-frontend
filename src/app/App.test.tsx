import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('../features/corpus', () => ({ Corpus: () => <section aria-label="Corpus">Corpus reader</section> }));

describe('application workspace', () => {
  it('preserves accessible branding, main landmark and no-analysis honesty', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Neguentropía' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAccessibleName('Workspace');
    expect(screen.getByText('No analysis has been run.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /compare|rank|search|cluster/i })).not.toBeInTheDocument();
  });
  it('composes the corpus reader instead of the obsolete pending-only shell', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Corpus' })).toBeVisible();
    expect(screen.queryByText('Corpus preparation is pending.')).not.toBeInTheDocument();
  });
});
