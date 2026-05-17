import { describe, expect, it } from 'vitest';
import { WORDS } from '../data/words';
import { createGameRound } from './generator';
import type { DifficultyMode, RoundTarget } from './types';

function verifyTargetPaths(targets: RoundTarget[], rows: number, cols: number): void {
  for (const target of targets) {
    expect(target.path.length).toBe(target.text.length);

    for (let index = 1; index < target.path.length; index += 1) {
      const previous = target.path[index - 1];
      const current = target.path[index];
      const [prevRow, prevCol] = previous
        .slice(1)
        .split('c')
        .map((value) => Number.parseInt(value, 10));
      const [nextRow, nextCol] = current
        .slice(1)
        .split('c')
        .map((value) => Number.parseInt(value, 10));

      expect(Math.abs(prevRow - nextRow) + Math.abs(prevCol - nextCol)).toBe(1);
      expect(prevRow).toBeGreaterThanOrEqual(0);
      expect(prevCol).toBeGreaterThanOrEqual(0);
      expect(nextRow).toBeLessThan(rows);
      expect(nextCol).toBeLessThan(cols);
    }
  }
}

describe('createGameRound', () => {
  it.each([
    ['easy', 8],
    ['normal', 14],
    ['hard', WORDS.length],
  ] satisfies Array<[DifficultyMode, number]>)(
    'creates a filled board for %s mode',
    (difficulty, expectedTargets) => {
      const round = createGameRound(difficulty, 20260516);

      expect(round.targets).toHaveLength(expectedTargets);
      expect(round.board).toHaveLength(round.rows * round.cols);
      expect(round.board.every((cell) => cell.char.length === 1)).toBe(true);
      expect(round.board.every((cell) => cell.cleared === false)).toBe(true);

      const targetCellIds = new Set(round.targets.flatMap((target) => target.path));
      expect(targetCellIds.size).toBe(round.targets.reduce((sum, target) => sum + target.path.length, 0));

      verifyTargetPaths(round.targets, round.rows, round.cols);
    },
  );

  it('is reproducible with the same seed', () => {
    const first = createGameRound('normal', 424242);
    const second = createGameRound('normal', 424242);

    expect(first.rows).toBe(second.rows);
    expect(first.cols).toBe(second.cols);
    expect(first.targets).toEqual(second.targets);
    expect(first.board.map((cell) => `${cell.id}:${cell.char}:${cell.targetId ?? ''}`)).toEqual(
      second.board.map((cell) => `${cell.id}:${cell.char}:${cell.targetId ?? ''}`),
    );
  });

  it('keeps every target text aligned with the board across many seeds', () => {
    const difficulties: DifficultyMode[] = ['easy', 'normal', 'hard'];
    const roundsPerDifficulty = {
      easy: 500,
      normal: 500,
      hard: 150,
    } as const;

    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= roundsPerDifficulty[difficulty]; seed += 1) {
        const round = createGameRound(difficulty, seed);
        const boardLookup = new Map(round.board.map((cell) => [cell.id, cell.char]));

        for (const target of round.targets) {
          const boardText = target.path.map((cellId) => boardLookup.get(cellId) ?? '').join('');
          expect(boardText).toBe(target.text);
        }
      }
    }
  }, 10_000);
});
