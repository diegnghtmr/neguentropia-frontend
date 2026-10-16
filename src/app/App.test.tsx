import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('application foundation', () => {
  it('shows an accessible, honest shell without loading corpus or analysis data', () => {
    const fetchRequest = vi.spyOn(globalThis, 'fetch');
    const xhrRequest = vi.spyOn(XMLHttpRequest.prototype, 'open');

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Neguentropía' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAccessibleName('Workspace');
    expect(screen.getByRole('heading', { level: 2, name: 'Workspace status' })).toBeVisible();
    expect(screen.getByText('Corpus preparation is pending.')).toBeVisible();
    expect(screen.getByText('No analysis has been run.')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(fetchRequest).not.toHaveBeenCalled();
    expect(xhrRequest).not.toHaveBeenCalled();
  });
});
