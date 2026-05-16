import { describe, expect, it } from 'vitest';
import { findMatchedTarget, updateSelection } from './logic';
import type { BoardCell, RoundTarget } from './types';

const board: BoardCell[] = [
  { id: 'r0c0', char: '巴', row: 0, col: 0, cleared: false },
  { id: 'r0c1', char: '黎', row: 0, col: 1, cleared: false },
  { id: 'r1c0', char: '京', row: 1, col: 0, cleared: false },
  { id: 'r1c1', char: '都', row: 1, col: 1, cleared: false },
];

const boardLookup = new Map(board.map((cell) => [cell.id, cell]));

const targets: RoundTarget[] = [
  { id: 'paris', text: '巴黎', category: 'place', path: ['r0c0', 'r0c1'], matched: false },
  { id: 'capital', text: '京都', category: 'place', path: ['r1c0', 'r1c1'], matched: false },
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
  it('matches only exact path and exact order', () => {
    expect(findMatchedTarget(['r0c0', 'r0c1'], targets)?.id).toBe('paris');
    expect(findMatchedTarget(['r0c1', 'r0c0'], targets)).toBeNull();
    expect(findMatchedTarget(['r0c0'], targets)).toBeNull();
  });
});
