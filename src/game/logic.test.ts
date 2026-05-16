import { describe, expect, it } from 'vitest';
import { findMatchedTarget, updateSelection } from './logic';
import type { BoardCell, RoundTarget } from './types';

const board: BoardCell[] = [
  { id: 'r0c0', char: '巴', row: 0, col: 0, cleared: false, targetId: 'paris' },
  { id: 'r0c1', char: '黎', row: 0, col: 1, cleared: false, targetId: 'paris' },
  { id: 'r1c0', char: '巴', row: 1, col: 0, cleared: false },
  { id: 'r1c1', char: '黎', row: 1, col: 1, cleared: false, targetId: 'other-word' },
  { id: 'r1c2', char: '城', row: 1, col: 2, cleared: false, targetId: 'other-word' },
  { id: 'r2c0', char: '京', row: 2, col: 0, cleared: false, targetId: 'capital' },
  { id: 'r2c1', char: '都', row: 2, col: 1, cleared: false, targetId: 'capital' },
];

const boardLookup = new Map(board.map((cell) => [cell.id, cell]));

const targets: RoundTarget[] = [
  { id: 'paris', text: '巴黎', category: 'place', path: ['r0c0', 'r0c1'], matched: false },
  { id: 'capital', text: '京都', category: 'place', path: ['r2c0', 'r2c1'], matched: false },
  { id: 'other-word', text: '黎城', category: 'restaurant', path: ['r1c1', 'r1c2'], matched: false },
];

describe('updateSelection', () => {
  it('starts from an empty selection', () => {
    const result = updateSelection([], 'r0c0', boardLookup);
    expect(result.nextSelection).toEqual(['r0c0']);
    expect(result.action).toBe('start');
  });

  it('appends only orthogonally adjacent cells', () => {
    const result = updateSelection(['r0c0'], 'r0c1', boardLookup);
    expect(result.nextSelection).toEqual(['r0c0', 'r0c1']);
    expect(result.action).toBe('append');
  });

  it('ignores non-adjacent misclicks without clearing the selection', () => {
    const result = updateSelection(['r0c0'], 'r1c1', boardLookup);
    expect(result.nextSelection).toEqual(['r0c0']);
    expect(result.action).toBe('ignore-non-adjacent');
  });

  it('removes the clicked selected cell and the cells after it', () => {
    const result = updateSelection(['r0c0', 'r0c1', 'r1c1'], 'r0c1', boardLookup);
    expect(result.nextSelection).toEqual(['r0c0']);
    expect(result.action).toBe('remove');
  });
});

describe('findMatchedTarget', () => {
  it('matches any valid path that spells the target in order', () => {
    expect(findMatchedTarget(['r0c0', 'r0c1'], targets, boardLookup)?.id).toBe('paris');
    expect(findMatchedTarget(['r1c0', 'r0c1'], targets, boardLookup)?.id).toBe('paris');
  });

  it('rejects reversed order and incomplete text', () => {
    expect(findMatchedTarget(['r0c1', 'r0c0'], targets, boardLookup)).toBeNull();
    expect(findMatchedTarget(['r0c0'], targets, boardLookup)).toBeNull();
  });

  it('does not allow borrowing cells from another unmatched target', () => {
    expect(findMatchedTarget(['r0c0', 'r1c1'], targets, boardLookup)).toBeNull();
  });
});
