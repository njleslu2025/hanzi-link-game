export type Category = 'place' | 'restaurant';

export type DifficultyMode = 'easy' | 'normal' | 'hard';

export interface WordEntry {
  id: string;
  text: string;
  category: Category;
}

export interface BoardCell {
  id: string;
  char: string;
  row: number;
  col: number;
  targetId?: string;
  cleared: boolean;
}

export interface RoundTarget {
  id: string;
  text: string;
  category: Category;
  path: string[];
  matched: boolean;
}

export interface GameRound {
  seed: number;
  difficulty: DifficultyMode;
  rows: number;
  cols: number;
  board: BoardCell[];
  targets: RoundTarget[];
}
