import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config';
import { type InputState } from '../game/input';
import type { LeaderboardEntry } from '../../../api/src/common-types';

// Leaderboard state — populated externally via setLeaderboardData
let entries: LeaderboardEntry[] = [];
let topScore = 0n;

export function setLeaderboardData(data: { entries: LeaderboardEntry[]; topScore: bigint }): void {
  entries = data.entries;
  topScore = data.topScore;
}

export function renderLeaderboard(
  ctx: CanvasRenderingContext2D,
  timer: number,
): void {
  // Title
  ctx.fillStyle = '#6366f1';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEADERBOARD', VIRTUAL_WIDTH / 2, 25);

  // Column headers
  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('RANK', 20, 42);
  ctx.fillText('PILOT', 55, 42);
  ctx.textAlign = 'right';
  ctx.fillText('SCORE', VIRTUAL_WIDTH - 20, 42);

  // Divider
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 45, VIRTUAL_WIDTH - 40, 1);

  // Entries
  const maxVisible = 10;
  const visibleEntries = entries.slice(0, maxVisible);

  for (let i = 0; i < visibleEntries.length; i++) {
    const entry = visibleEntries[i];
    const y = 56 + i * 12;
    const rank = i + 1;

    // Rank color
    ctx.fillStyle = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : rank === 3 ? '#f97316' : '#64748b';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${rank}.`, 20, y);

    // Alias
    ctx.fillStyle = '#ffffff';
    const alias = entry.alias.length > 12 ? entry.alias.slice(0, 12) + '..' : entry.alias;
    ctx.fillText(alias, 55, y);

    // Score
    ctx.textAlign = 'right';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(entry.score.toString(), VIRTUAL_WIDTH - 20, y);
  }

  if (entries.length === 0) {
    ctx.fillStyle = '#334155';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No scores yet', VIRTUAL_WIDTH / 2, 80);
    ctx.fillText('Be the first pilot!', VIRTUAL_WIDTH / 2, 92);
  }

  // Top score banner
  if (topScore > 0n) {
    ctx.fillStyle = '#6366f1';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TOP SCORE: ${topScore}`, VIRTUAL_WIDTH / 2, 195);
  }

  // Actions
  if (Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER = PLAY AGAIN', VIRTUAL_WIDTH / 2, 215);
  }

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('P = PROVE ELITE (ZK proof: score > threshold)', VIRTUAL_WIDTH / 2, 230);
}

export function handleLeaderboardInput(
  input: InputState,
  callbacks: {
    onPlayAgain: () => void;
    onProveElite?: (threshold: bigint) => void;
  },
): void {
  if (input.enter) {
    callbacks.onPlayAgain();
  }
}
