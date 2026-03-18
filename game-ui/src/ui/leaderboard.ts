import { VIRTUAL_WIDTH } from '../config';
import { type InputState } from '../game/input';
import type { LeaderboardEntry } from '../../../api/src/common-types';

// Leaderboard state — populated externally via setLeaderboardData
let entries: LeaderboardEntry[] = [];
let topScore = 0n;

// Prove elite threshold input
let enteringThreshold = false;
let thresholdBuffer = '';

// On-canvas banner notification (renders over leaderboard)
let bannerMessage = '';
let bannerType: 'success' | 'error' = 'success';
let bannerTimer = 0;
const BANNER_DURATION = 4;

export function setLeaderboardData(data: { entries: LeaderboardEntry[]; topScore: bigint }): void {
  entries = data.entries;
  topScore = data.topScore;
}

/** Reset threshold input state. Call on screen transitions away from leaderboard. */
export function resetThresholdInput(): void {
  if (enteringThreshold) {
    enteringThreshold = false;
    thresholdBuffer = '';
    removeThresholdListener();
  }
}

export function showBanner(message: string, type: 'success' | 'error'): void {
  bannerMessage = message;
  bannerType = type;
  bannerTimer = BANNER_DURATION;
}

export function renderLeaderboard(
  ctx: CanvasRenderingContext2D,
  timer: number,
  dt: number = 0,
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
  ctx.fillText('STATUS', VIRTUAL_WIDTH - 20, 42);

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

    ctx.fillStyle = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : rank === 3 ? '#f97316' : '#64748b';
    ctx.font = '6px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${rank}.`, 20, y);

    ctx.fillStyle = '#ffffff';
    const alias = entry.alias.length > 12 ? entry.alias.slice(0, 12) + '..' : entry.alias;
    ctx.fillText(alias, 55, y);

    // Status column — show revealed score or "HIDDEN"
    ctx.textAlign = 'right';
    if (entry.revealedScore !== null) {
      ctx.fillStyle = '#22c55e';
      ctx.fillText(entry.revealedScore.toString(), VIRTUAL_WIDTH - 20, y);
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillText('HIDDEN', VIRTUAL_WIDTH - 20, y);
    }
  }

  if (entries.length === 0) {
    ctx.fillStyle = '#334155';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No scores yet', VIRTUAL_WIDTH / 2, 80);
    ctx.fillText('Be the first pilot!', VIRTUAL_WIDTH / 2, 92);
  }

  // Top revealed score banner
  if (topScore > 0n) {
    ctx.fillStyle = '#6366f1';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TOP REVEALED SCORE: ${topScore}`, VIRTUAL_WIDTH / 2, 185);
  }

  // Threshold input overlay
  if (enteringThreshold) {
    ctx.fillStyle = 'rgba(0, 0, 8, 0.85)';
    ctx.fillRect(40, 95, VIRTUAL_WIDTH - 80, 50);
    ctx.strokeStyle = '#6366f1';
    ctx.strokeRect(40, 95, VIRTUAL_WIDTH - 80, 50);

    ctx.fillStyle = '#6366f1';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PROVE ELITE — Enter threshold:', VIRTUAL_WIDTH / 2, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    const cursor = Math.floor(timer * 3) % 2 === 0 ? '_' : '';
    ctx.fillText(thresholdBuffer + cursor, VIRTUAL_WIDTH / 2, 128);

    ctx.fillStyle = '#64748b';
    ctx.font = '4px monospace';
    ctx.fillText('ENTER = Submit proof    ESC = Cancel', VIRTUAL_WIDTH / 2, 140);
    return;
  }

  // Actions
  if (Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER = PLAY AGAIN', VIRTUAL_WIDTH / 2, 205);
  }

  ctx.fillStyle = '#8b5cf6';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('P = PROVE ELITE (ZK proof: score >= threshold)', VIRTUAL_WIDTH / 2, 218);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '5px monospace';
  ctx.fillText('R = REVEAL YOUR SCORE', VIRTUAL_WIDTH / 2, 228);

  // On-canvas banner notification
  if (bannerTimer > 0) {
    bannerTimer -= dt;
    const alpha = bannerTimer > 0.5 ? 1 : bannerTimer * 2;
    const bgColor = bannerType === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    const bannerY = 190;
    const bannerH = 16;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = bgColor;
    ctx.fillRect(20, bannerY, VIRTUAL_WIDTH - 40, bannerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bannerMessage, VIRTUAL_WIDTH / 2, bannerY + 11);
    ctx.globalAlpha = 1;
  }
}

export function handleLeaderboardInput(
  input: InputState,
  callbacks: {
    onPlayAgain: () => void;
    onProveElite?: (threshold: bigint) => void;
    onRevealScore?: () => void;
  },
): void {
  if (enteringThreshold) {
    if (input.enter && thresholdBuffer.length > 0) {
      const threshold = BigInt(thresholdBuffer);
      enteringThreshold = false;
      thresholdBuffer = '';
      removeThresholdListener();
      callbacks.onProveElite?.(threshold);
    }
    if (input.escape) {
      enteringThreshold = false;
      thresholdBuffer = '';
      removeThresholdListener();
    }
    return;
  }

  if (input.enter) {
    callbacks.onPlayAgain();
  }

  if (input.prove && callbacks.onProveElite) {
    enteringThreshold = true;
    thresholdBuffer = '';
    installThresholdListener();
  }

  if (input.reveal && callbacks.onRevealScore) {
    callbacks.onRevealScore();
  }
}

// Direct keydown listener for digit entry (bypasses game input system)
let thresholdListener: ((e: KeyboardEvent) => void) | null = null;

function installThresholdListener(): void {
  thresholdListener = (e: KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9' && thresholdBuffer.length < 10) {
      thresholdBuffer += e.key;
    }
    if (e.key === 'Backspace') {
      thresholdBuffer = thresholdBuffer.slice(0, -1);
    }
  };
  window.addEventListener('keydown', thresholdListener);
}

function removeThresholdListener(): void {
  if (thresholdListener) {
    window.removeEventListener('keydown', thresholdListener);
    thresholdListener = null;
  }
}
