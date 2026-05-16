import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { WORDS } from './data/words';

describe('App', () => {
  it('shows the easy mode target count by default and switches difficulty counts', () => {
    render(<App />);

    expect(screen.getAllByText('0/12').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '普通' }));
    expect(screen.getAllByText('0/20').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '困难' }));
    expect(screen.getAllByText(`0/${WORDS.length}`).length).toBeGreaterThan(0);
  });

  it('keeps the confirm button disabled before any selection', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  });
});
