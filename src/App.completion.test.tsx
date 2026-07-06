import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockRound = {
  seed: 1,
  difficulty: 'easy' as const,
  rows: 1,
  cols: 2,
  board: [
    { id: 'r0c0', char: '巴', row: 0, col: 0, targetId: 'paris', cleared: false },
    { id: 'r0c1', char: '黎', row: 0, col: 1, targetId: 'paris', cleared: false },
  ],
  targets: [
    {
      id: 'paris',
      text: '巴黎',
      category: 'place' as const,
      path: ['r0c0', 'r0c1'],
      matched: false,
    },
  ],
};

const alternatePathRound = {
  seed: 2,
  difficulty: 'easy' as const,
  rows: 2,
  cols: 3,
  board: [
    { id: 'r0c0', char: '杏', row: 0, col: 0, targetId: 'xinghua', cleared: false },
    { id: 'r0c1', char: '花', row: 0, col: 1, targetId: 'xinghua', cleared: false },
    { id: 'r0c2', char: '楼', row: 0, col: 2, targetId: 'xinghua', cleared: false },
    { id: 'r1c0', char: '雨', row: 1, col: 0, cleared: false },
    { id: 'r1c1', char: '杏', row: 1, col: 1, cleared: false },
    { id: 'r1c2', char: '夜', row: 1, col: 2, cleared: false },
  ],
  targets: [
    {
      id: 'xinghua',
      text: '杏花楼',
      category: 'restaurant' as const,
      path: ['r0c0', 'r0c1', 'r0c2'],
      matched: false,
    },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.doUnmock('./game/generator');
  vi.doUnmock('./data/words');
});

describe('App completion overlay', () => {
  it('plays the heart animation before showing the completion panel', async () => {
    vi.useFakeTimers();

    vi.doMock('./game/generator', () => ({
      createGameRound: () => mockRound,
    }));
    vi.doMock('./data/words', () => ({
      WORDS: [{ id: 'paris', text: '巴黎', category: 'place' }],
    }));

    const { default: App } = await import('./App');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '棋盘文字 巴' }));
    fireEvent.click(screen.getByRole('button', { name: '棋盘文字 黎' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));

    expect(screen.getByTestId('completion-heart-scene')).toBeInTheDocument();
    expect(screen.queryByText('恭喜通关')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1700);
    });

    expect(screen.getByText('恭喜通关')).toBeInTheDocument();
    expect(screen.getByText('看来我们之间的经历你并没有忘记')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开生日礼物' })).toHaveAttribute(
      'href',
      '/birthday/index.html',
    );
  });

  it('clears only the submitted path when an alternate valid route is used', async () => {
    vi.doMock('./game/generator', () => ({
      createGameRound: () => alternatePathRound,
    }));
    vi.doMock('./data/words', () => ({
      WORDS: [{ id: 'xinghua', text: '杏花楼', category: 'restaurant' }],
    }));

    const { default: App } = await import('./App');

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: '棋盘文字 杏' })[1]);
    fireEvent.click(screen.getByRole('button', { name: '棋盘文字 花' }));
    fireEvent.click(screen.getByRole('button', { name: '棋盘文字 楼' }));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));

    expect(screen.getAllByRole('button', { name: '棋盘文字 杏' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '棋盘文字 花' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '棋盘文字 楼' })).not.toBeInTheDocument();
  });
});
