import { WORDS } from '../data/words';
import type {
  BoardCell,
  DifficultyMode,
  GameRound,
  RoundTarget,
  WordEntry,
} from './types';
import { createSeededRandom, randomInt, shuffleArray } from './random';

interface Coord {
  row: number;
  col: number;
}

interface BoardSize {
  rows: number;
  cols: number;
}

interface GridCell {
  char: string;
  targetId?: string;
}

const DIFFICULTY_COUNTS: Record<DifficultyMode, number> = {
  easy: 12,
  normal: 20,
  hard: WORDS.length,
};

const DISTRACTOR_POOL = [
  '山',
  '水',
  '风',
  '云',
  '月',
  '星',
  '花',
  '林',
  '城',
  '门',
  '江',
  '河',
  '春',
  '秋',
  '夏',
  '冬',
  '海',
  '湖',
  '桥',
  '街',
  '园',
  '楼',
  '巷',
  '雨',
  '夜',
  '火',
  '茶',
  '香',
  '味',
  '里',
  '北',
  '南',
  '东',
  '西',
  '金',
  '玉',
  '明',
  '和',
  '乐',
  '福',
  '安',
  '丰',
  '泰',
  '华',
  '清',
  '源',
];

const MIN_BOARD_SIDE = 7;
const TARGET_DENSITY = 0.58;
const MAX_LAYOUT_ATTEMPTS = 80;
const MAX_SIZE_EXPANSIONS = 12;

function createCellId(row: number, col: number): string {
  return `r${row}c${col}`;
}

function createEmptyGrid(rows: number, cols: number): Array<Array<GridCell | null>> {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function countTotalCharacters(words: WordEntry[]): number {
  return words.reduce((total, word) => total + [...word.text].length, 0);
}

function chooseBoardSize(totalCharacters: number): BoardSize {
  const requiredArea = Math.ceil(totalCharacters / TARGET_DENSITY);
  let rows = Math.max(MIN_BOARD_SIDE, Math.floor(Math.sqrt(requiredArea)));
  let cols = Math.max(MIN_BOARD_SIDE, Math.ceil(requiredArea / rows));

  while (rows * cols < requiredArea) {
    if (rows <= cols) {
      rows += 1;
    } else {
      cols += 1;
    }
  }

  while (Math.max(rows, cols) / Math.min(rows, cols) > 1.25) {
    if (rows < cols) {
      rows += 1;
    } else {
      cols += 1;
    }
  }

  return { rows, cols };
}

function expandBoardSize(size: BoardSize): BoardSize {
  if (size.rows <= size.cols) {
    return { rows: size.rows + 1, cols: size.cols };
  }

  return { rows: size.rows, cols: size.cols + 1 };
}

function getNeighbors(cell: Coord, rows: number, cols: number): Coord[] {
  const offsets = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  return offsets
    .map((offset) => ({ row: cell.row + offset.row, col: cell.col + offset.col }))
    .filter((next) => next.row >= 0 && next.row < rows && next.col >= 0 && next.col < cols);
}

function countOpenNeighbors(
  cell: Coord,
  grid: Array<Array<GridCell | null>>,
  used: Set<string>,
): number {
  return getNeighbors(cell, grid.length, grid[0].length).filter((neighbor) => {
    const key = createCellId(neighbor.row, neighbor.col);
    return !used.has(key) && grid[neighbor.row][neighbor.col] === null;
  }).length;
}

function findPath(
  length: number,
  grid: Array<Array<GridCell | null>>,
  random: () => number,
): Coord[] | null {
  const allStarts: Coord[] = [];
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      if (grid[row][col] === null) {
        allStarts.push({ row, col });
      }
    }
  }

  const candidateStarts = shuffleArray(allStarts, random).sort(
    (left, right) =>
      countOpenNeighbors(right, grid, new Set()) - countOpenNeighbors(left, grid, new Set()),
  );

  const visit = (path: Coord[], used: Set<string>): Coord[] | null => {
    if (path.length === length) {
      return path;
    }

    const current = path[path.length - 1];
    const candidateNeighbors = shuffleArray(
      getNeighbors(current, grid.length, grid[0].length).filter((neighbor) => {
        const key = createCellId(neighbor.row, neighbor.col);
        return !used.has(key) && grid[neighbor.row][neighbor.col] === null;
      }),
      random,
    ).sort(
      (left, right) => countOpenNeighbors(right, grid, used) - countOpenNeighbors(left, grid, used),
    );

    for (const neighbor of candidateNeighbors) {
      const key = createCellId(neighbor.row, neighbor.col);
      used.add(key);
      const result = visit([...path, neighbor], used);
      if (result) {
        return result;
      }
      used.delete(key);
    }

    return null;
  };

  for (const start of candidateStarts) {
    const key = createCellId(start.row, start.col);
    const path = visit([start], new Set([key]));
    if (path) {
      return path;
    }
  }

  return null;
}

function pickTargets(difficulty: DifficultyMode, random: () => number): WordEntry[] {
  const shuffled = shuffleArray(WORDS, random);
  const targetCount = DIFFICULTY_COUNTS[difficulty];

  if (difficulty === 'hard') {
    return shuffled;
  }

  return shuffled.slice(0, targetCount);
}

function createDistractorPool(words: WordEntry[]): string[] {
  const charsFromWords = words.flatMap((word) => [...word.text]);
  return [...DISTRACTOR_POOL, ...charsFromWords];
}

function buildBoard(
  grid: Array<Array<GridCell | null>>,
  distractorChars: string[],
  random: () => number,
): BoardCell[] {
  const board: BoardCell[] = [];

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      const placed = grid[row][col];
      board.push({
        id: createCellId(row, col),
        char: placed?.char ?? distractorChars[randomInt(distractorChars.length, random)],
        row,
        col,
        targetId: placed?.targetId,
        cleared: false,
      });
    }
  }

  return board;
}

function targetsMatchBoard(board: BoardCell[], targets: RoundTarget[]): boolean {
  const boardLookup = new Map(board.map((cell) => [cell.id, cell.char]));

  return targets.every((target) => {
    const boardText = target.path.map((cellId) => boardLookup.get(cellId) ?? '').join('');
    return boardText === target.text;
  });
}

function tryLayout(
  words: WordEntry[],
  size: BoardSize,
  random: () => number,
): { board: BoardCell[]; targets: RoundTarget[] } | null {
  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt += 1) {
    const grid = createEmptyGrid(size.rows, size.cols);
    const targets: RoundTarget[] = [];
    const placementOrder = shuffleArray(words, random).sort(
      (left, right) => [...right.text].length - [...left.text].length,
    );

    let failed = false;

    for (const word of placementOrder) {
      const characters = [...word.text];
      const path = findPath(characters.length, grid, random);

      if (!path) {
        failed = true;
        break;
      }

      path.forEach((coord, index) => {
        grid[coord.row][coord.col] = {
          char: characters[index],
          targetId: word.id,
        };
      });

      targets.push({
        id: word.id,
        text: word.text,
        category: word.category,
        path: path.map((coord) => createCellId(coord.row, coord.col)),
        matched: false,
      });
    }

    if (failed) {
      continue;
    }

    const distractorPool = createDistractorPool(words);
    const board = buildBoard(grid, distractorPool, random);

    if (!targetsMatchBoard(board, targets)) {
      continue;
    }

    return {
      board,
      targets,
    };
  }

  return null;
}

export function createGameRound(difficulty: DifficultyMode, seed: number): GameRound {
  const random = createSeededRandom(seed);
  const selectedWords = pickTargets(difficulty, random);
  const totalCharacters = countTotalCharacters(selectedWords);
  let boardSize = chooseBoardSize(totalCharacters);

  for (let expansion = 0; expansion <= MAX_SIZE_EXPANSIONS; expansion += 1) {
    const layout = tryLayout(selectedWords, boardSize, random);
    if (layout) {
      return {
        seed,
        difficulty,
        rows: boardSize.rows,
        cols: boardSize.cols,
        board: layout.board,
        targets: layout.targets,
      };
    }
    boardSize = expandBoardSize(boardSize);
  }

  throw new Error('无法为当前词库生成可用棋盘');
}

export function getDifficultyTargetCount(mode: DifficultyMode): number {
  return DIFFICULTY_COUNTS[mode];
}
