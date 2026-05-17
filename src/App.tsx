import { useEffect, useState } from 'react';
import { WORDS } from './data/words';
import { createGameRound } from './game/generator';
import { createBoardLookup, findMatchedTarget, updateSelection } from './game/logic';
import type { BoardCell, DifficultyMode, GameRound } from './game/types';

interface NoticeState {
  kind: 'error' | 'success' | 'info';
  text: string;
}

type CompletionStage = 'hidden' | 'heart' | 'panel';

const DIFFICULTY_LABELS: Record<DifficultyMode, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const COMPLETION_HEART_DURATION_MS = 1700;
const REDUCED_MOTION_HEART_DURATION_MS = 420;

function createFreshSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function createRound(difficulty: DifficultyMode, seed: number): GameRound {
  return createGameRound(difficulty, seed);
}

function getCategoryLabel(category: GameRound['targets'][number]['category']): string {
  return category === 'place' ? '地名' : '饭店';
}

function getCellOrder(selection: string[]): Map<string, number> {
  return new Map(selection.map((cellId, index) => [cellId, index + 1]));
}

function getSelectionText(selection: string[], boardLookup: Map<string, BoardCell>): string {
  return selection
    .map((cellId) => boardLookup.get(cellId)?.char ?? '')
    .filter(Boolean)
    .join('');
}

function getCompletionHeartDuration(): number {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return REDUCED_MOTION_HEART_DURATION_MS;
  }

  return COMPLETION_HEART_DURATION_MS;
}

export default function App() {
  const [difficulty, setDifficulty] = useState<DifficultyMode>('easy');
  const [seed, setSeed] = useState<number>(() => createFreshSeed());
  const [round, setRound] = useState<GameRound>(() => createRound('easy', seed));
  const [selection, setSelection] = useState<string[]>([]);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [completionStage, setCompletionStage] = useState<CompletionStage>('hidden');

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const boardLookup = createBoardLookup(round.board);
  const selectionOrder = getCellOrder(selection);
  const currentText = getSelectionText(selection, boardLookup);
  const completedCount = round.targets.filter((target) => target.matched).length;
  const totalCount = round.targets.length;
  const isComplete = completedCount === totalCount;

  useEffect(() => {
    if (!isComplete) {
      setCompletionStage('hidden');
      return undefined;
    }

    setCompletionStage('heart');

    const timer = window.setTimeout(() => {
      setCompletionStage('panel');
    }, getCompletionHeartDuration());

    return () => window.clearTimeout(timer);
  }, [isComplete, round.seed]);

  const startRound = (nextDifficulty: DifficultyMode, nextSeed: number) => {
    setDifficulty(nextDifficulty);
    setSeed(nextSeed);
    setRound(createRound(nextDifficulty, nextSeed));
    setSelection([]);
    setNotice(null);
    setCompletionStage('hidden');
  };

  const handleDifficultyChange = (mode: DifficultyMode) => {
    if (mode === difficulty) {
      return;
    }

    startRound(mode, createFreshSeed());
  };

  const handleRestart = () => {
    startRound(difficulty, seed);
  };

  const handleNewRound = () => {
    startRound(difficulty, createFreshSeed());
  };

  const handleCellClick = (cellId: string) => {
    const result = updateSelection(selection, cellId, boardLookup);
    setSelection(result.nextSelection);

    if (result.action === 'ignore-non-adjacent') {
      setNotice({ kind: 'info', text: '只能连接上下左右相邻的汉字。' });
      return;
    }

    if (result.action === 'ignore-cleared') {
      return;
    }

    setNotice(null);
  };

  const handleSubmit = () => {
    if (selection.length === 0) {
      return;
    }

    const matchedTarget = findMatchedTarget(selection, round.targets, boardLookup);

    if (!matchedTarget) {
      setNotice({ kind: 'error', text: '答案不正确，请检查顺序或位置。' });
      return;
    }

    const matchedCellIds = new Set(selection);
    setRound((currentRound) => ({
      ...currentRound,
      board: currentRound.board.map((cell) =>
        matchedCellIds.has(cell.id) ? { ...cell, cleared: true } : cell,
      ),
      targets: currentRound.targets.map((target) =>
        target.id === matchedTarget.id ? { ...target, matched: true } : target,
      ),
    }));
    setSelection([]);
    setNotice({ kind: 'success', text: `已完成 ${matchedTarget.text}` });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">霓虹记忆小游戏</p>
          <h1>你还记得这些吗？</h1>
          <p className="subtitle">
            把散在晚风和灯牌里的旧地名、熟悉饭店名，一笔一画地重新拼回来。
          </p>
          <div className="hero-hearts" aria-hidden="true">
            <span>♥</span>
            <span>♥</span>
            <span>♥</span>
          </div>
        </div>
        <div className="topbar-meta">
          <div className="difficulty-switch" role="tablist" aria-label="选择难度">
            {(['easy', 'normal', 'hard'] as DifficultyMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={mode === difficulty ? 'difficulty-button active' : 'difficulty-button'}
                onClick={() => handleDifficultyChange(mode)}
              >
                {DIFFICULTY_LABELS[mode]}
              </button>
            ))}
          </div>
          <div className="progress-chip" aria-live="polite">
            {completedCount}/{totalCount}
          </div>
        </div>
      </header>

      <main className="game-layout">
        <section className="board-section" aria-label="游戏棋盘区域">
          <div className="board-header">
            <div>
              <h2>字阵</h2>
              <p>
                {DIFFICULTY_LABELS[difficulty]}模式 · {round.rows} × {round.cols}
              </p>
            </div>
            <div className="board-actions">
              <button type="button" className="ghost-button" onClick={handleRestart}>
                重开本局
              </button>
              <button type="button" className="ghost-button" onClick={handleNewRound}>
                再来一局
              </button>
            </div>
          </div>

          <div className="board-scroll">
            <div
              className="board-grid"
              style={{
                gridTemplateColumns: `repeat(${round.cols}, var(--cell-size))`,
                gridTemplateRows: `repeat(${round.rows}, var(--cell-size))`,
              }}
            >
              {round.board.map((cell) => {
                const order = selectionOrder.get(cell.id);
                const isSelected = order !== undefined;
                const isCleared = cell.cleared;
                const className = [
                  'board-cell',
                  isSelected ? 'selected' : '',
                  isCleared ? 'cleared' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={cell.id}
                    type="button"
                    className={className}
                    onClick={() => handleCellClick(cell.id)}
                    disabled={isCleared}
                    aria-label={isCleared ? '已消除空位' : `棋盘文字 ${cell.char}`}
                  >
                    {!isCleared && (
                      <>
                        <span className="cell-char">{cell.char}</span>
                        {order !== undefined && <span className="cell-order">{order}</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="info-section">
          <section className="target-section" aria-label="待找名称">
            <div className="section-heading">
              <h2>待找名称</h2>
              <span className="section-note">{completedCount}/{totalCount}</span>
            </div>
            <ul className="target-list">
              {round.targets.map((target) => (
                <li
                  key={target.id}
                  className={target.matched ? 'target-item matched' : 'target-item'}
                >
                  <span className="target-name">{target.text}</span>
                  <span className="target-meta">{getCategoryLabel(target.category)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rules-section" aria-label="规则提示">
            <div className="section-heading">
              <h2>规则</h2>
            </div>
            <ul className="rule-list">
              <li>必须按名称的正确顺序点击汉字。</li>
              <li>只能连接上下左右相邻的格子。</li>
              <li>误点非相邻格子不会清空当前选择。</li>
              <li>选完后点击“确定”才会提交校验。</li>
            </ul>
          </section>
        </aside>
      </main>

      <section className="selection-bar" aria-label="当前选择">
        <div className="selection-copy">
          <p className="selection-label">当前选择</p>
          <p className="selection-value">{currentText || '请先点选一个名称的汉字。'}</p>
        </div>
        <button
          type="button"
          className="submit-button"
          onClick={handleSubmit}
          disabled={selection.length === 0}
        >
          确定
        </button>
      </section>

      {notice && (
        <div className={`notice-banner ${notice.kind}`} role="status" aria-live="polite">
          {notice.text}
        </div>
      )}

      {isComplete && completionStage === 'heart' && (
        <div className="completion-overlay completion-overlay-heart" aria-hidden="true">
          <div className="completion-heart-scene" data-testid="completion-heart-scene">
            <div className="completion-heart-glow" />
            <div className="completion-heart" />
            <span className="completion-heart-spark spark-left">✦</span>
            <span className="completion-heart-spark spark-right">♥</span>
            <span className="completion-heart-spark spark-bottom">✦</span>
          </div>
        </div>
      )}

      {isComplete && completionStage === 'panel' && (
        <div
          className="completion-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <div className="completion-panel">
            <div className="completion-burst" aria-hidden="true">
              <span>♥</span>
              <span>✦</span>
              <span>♥</span>
            </div>
            <p className="eyebrow">完成全部目标</p>
            <h2 id="completion-title">恭喜通关</h2>
            <p className="completion-message">看来我们之间的经历你并没有忘记</p>
            <p>你已经找出了本局全部 {totalCount} 个名称。</p>
            <div className="completion-actions">
              <button type="button" className="ghost-button" onClick={handleRestart}>
                重开本局
              </button>
              <button type="button" className="submit-button" onClick={handleNewRound}>
                再来一局
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-note">
        困难模式会把当前内置题库里的全部名称都放进棋盘，棋盘过大时可以直接滚动查看。
      </footer>
      <div className="sr-only">当前题库共 {WORDS.length} 个名称。</div>
    </div>
  );
}
