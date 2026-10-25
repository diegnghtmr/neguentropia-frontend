import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('../features/corpus', () => ({ Corpus: () => <section aria-label="Corpus">Corpus reader</section> }));
vi.mock('../features/ranking', () => ({ Ranking: () => <section aria-label="Ranking">Ranking screen</section> }));

describe('application workspace', () => {
  it('preserves accessible branding, main landmark and no-analysis honesty', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Neguentropía' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAccessibleName('Workspace');
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByText('Read the corpus or run a ranking.')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Corpus' })).toHaveAttribute('aria-selected', 'true');
  });
  it('supports mouse and keyboard navigation while preserving the corpus view', async () => {
    render(<App />);
    const corpus = screen.getByRole('tab', { name: 'Corpus' });
    const ranking = screen.getByRole('tab', { name: 'Ranking' });
    fireEvent.mouseDown(ranking);
    expect(ranking).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('region', { name: 'Ranking' })).toBeVisible();
    expect(screen.getByText('Corpus reader')).not.toBeVisible();
    ranking.focus();
    fireEvent.keyDown(ranking, { key: 'ArrowRight' });
    await waitFor(() => expect(corpus).toHaveFocus());
    expect(screen.getByRole('region', { name: 'Corpus' })).toBeVisible();
    fireEvent.keyDown(corpus, { key: 'End' });
    await waitFor(() => expect(ranking).toHaveFocus());
    fireEvent.keyDown(ranking, { key: 'Home' });
    await waitFor(() => expect(corpus).toHaveFocus());
    fireEvent.keyDown(corpus, { key: 'ArrowLeft' });
    await waitFor(() => expect(ranking).toHaveFocus());
    fireEvent.mouseDown(corpus);
    expect(screen.getByRole('region', { name: 'Corpus' })).toBeVisible();
  });
  it('composes the corpus reader instead of the obsolete pending-only shell', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: 'Corpus' })).toBeVisible();
    expect(screen.queryByText('Corpus preparation is pending.')).not.toBeInTheDocument();
  });
});
