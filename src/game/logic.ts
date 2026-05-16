import type { BoardCell, RoundTarget } from './types';

export type SelectionAction =
  | 'start'
  | 'append'
  | 'remove'
  | 'ignore-cleared'
  | 'ignore-non-adjacent';

export interface SelectionResult {
  nextSelection: string[];
  action: SelectionAction;
}

export function createBoardLookup(board: BoardCell[]): Map<string, BoardCell> {
  return new Map(board.map((cell) => [cell.id, cell]));
}

export function areOrthogonallyAdjacent(first: BoardCell, second: BoardCell): boolean {
  const rowDistance = Math.abs(first.row - second.row);
  const colDistance = Math.abs(first.col - second.col);

  return rowDistance + colDistance === 1;
}

export function updateSelection(
  currentSelection: string[],
  clickedId: string,
  boardLookup: Map<string, BoardCell>,
): SelectionResult {
  const clickedCell = boardLookup.get(clickedId);

  if (!clickedCell || clickedCell.cleared) {
    return { nextSelection: currentSelection, action: 'ignore-cleared' };
  }

  const selectedIndex = currentSelection.indexOf(clickedId);
  if (selectedIndex !== -1) {
    return {
      nextSelection: currentSelection.slice(0, selectedIndex),
      action: 'remove',
    };
  }

  if (currentSelection.length === 0) {
    return { nextSelection: [clickedId], action: 'start' };
  }

  const lastSelectedId = currentSelection[currentSelection.length - 1];
  const lastSelectedCell = boardLookup.get(lastSelectedId);

  if (!lastSelectedCell || !areOrthogonallyAdjacent(lastSelectedCell, clickedCell)) {
    return {
      nextSelection: currentSelection,
      action: 'ignore-non-adjacent',
    };
  }

  return {
    nextSelection: [...currentSelection, clickedId],
    action: 'append',
  };
}

export function findMatchedTarget(
  selection: string[],
  targets: RoundTarget[],
  boardLookup: Map<string, BoardCell>,
): RoundTarget | null {
  if (selection.length === 0) {
    return null;
  }

  const selectedCells = selection
    .map((cellId) => boardLookup.get(cellId))
    .filter((cell): cell is BoardCell => Boolean(cell));

  if (selectedCells.length !== selection.length) {
    return null;
  }

  const selectedText = selectedCells.map((cell) => cell.char).join('');

  return (
    targets.find((target) => {
      if (target.matched || target.text !== selectedText) {
        return false;
      }

      return selectedCells.every((cell) => !cell.targetId || cell.targetId === target.id);
    }) ?? null
  );
}
