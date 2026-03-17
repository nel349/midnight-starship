import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, SCALE } from '../config';
import { initInput, getInput } from './input';
import { getScreen, setScreen, updateScreenTimer, getScreenTimer } from './state';
import {
  initEntities,
  updateEntities,
  renderEntities,
  moveShip,
  firePlayerTorpedo,
  fighter,
  enemies,
  score,
  stage,
} from './entities';
import { renderHud } from '../ui/hud';
import { renderConnectScreen, handleConnectInput } from '../ui/connect-screen';
import { renderLeaderboard, handleLeaderboardInput } from '../ui/leaderboard';
import { getWalletClient } from '../providers/wallet-connector';
import { initAudio, playShoot, playMenuSelect, playLevelStart, playScoreSubmit, startTheme, stopTheme } from './audio';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let finalScore = 0;
let playerAlias = 'PILOT';

// Callbacks set by main.ts after providers are ready
let onSubmitScore: ((score: bigint, alias: string) => Promise<void>) | null = null;
let onProveElite: ((threshold: bigint) => Promise<void>) | null = null;

export function setCallbacks(callbacks: {
  submitScore?: (score: bigint, alias: string) => Promise<void>;
  proveElite?: (threshold: bigint) => Promise<void>;
}): void {
  if (callbacks.submitScore) onSubmitScore = callbacks.submitScore;
  if (callbacks.proveElite) onProveElite = callbacks.proveElite;
}

export function initEngine(): void {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  canvas.width = VIRTUAL_WIDTH * SCALE;
  canvas.height = VIRTUAL_HEIGHT * SCALE;

  ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  initInput();
  initAudio();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = time;

  const input = getInput();
  const screen = getScreen();

  // Clear
  ctx.save();
  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  updateScreenTimer(dt);

  switch (screen) {
    case 'connect':
      renderConnectScreen(ctx, getScreenTimer());
      handleConnectInput(input);
      break;

    case 'menu':
      renderMenu(ctx, getScreenTimer());
      if (input.enter) {
        playMenuSelect();
        initEntities();
        startTheme();
        playLevelStart();
        setScreen('playing');
      }
      break;

    case 'playing':
      if (input.left) moveShip(-1, dt);
      if (input.right) moveShip(1, dt);
      if (input.fire && firePlayerTorpedo()) playShoot();

      updateEntities(dt);
      renderEntities(ctx);
      renderHud(ctx, score, fighter.lives, stage, !!getWalletClient());

      // Check game over
      if (fighter.lives <= 0 && !fighter.alive) {
        finalScore = score;
        stopTheme();
        setScreen('gameover');
      }
      break;

    case 'gameover':
      renderEntities(ctx); // keep showing the field
      renderGameOver(ctx, finalScore, getScreenTimer());
      if (input.enter && getScreenTimer() > 0.5) {
        playMenuSelect();
        if (onSubmitScore) {
          setScreen('submitting');
          onSubmitScore(BigInt(finalScore), playerAlias)
            .then(() => { playScoreSubmit(); setScreen('leaderboard'); })
            .catch((err) => {
              console.error('Score submission failed:', err);
              setScreen('leaderboard');
            });
        } else {
          setScreen('leaderboard');
        }
      }
      if (input.escape) setScreen('leaderboard');
      break;

    case 'submitting':
      renderSubmitting(ctx, getScreenTimer());
      break;

    case 'leaderboard':
      renderLeaderboard(ctx, getScreenTimer());
      handleLeaderboardInput(input, {
        onPlayAgain: () => {
          initEntities();
          startTheme();
          playLevelStart();
          setScreen('playing');
        },
        onProveElite: onProveElite
          ? (threshold) => {
              onProveElite!(threshold);
            }
          : undefined,
      });
      break;
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// ── Screen renderers ──

function renderMenu(ctx: CanvasRenderingContext2D, timer: number): void {
  // Title
  ctx.fillStyle = '#6366f1';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT', VIRTUAL_WIDTH / 2, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText('STARSHIP', VIRTUAL_WIDTH / 2, 80);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = '6px monospace';
  ctx.fillText('A Midnight DApp Connector Demo', VIRTUAL_WIDTH / 2, 95);

  // Instructions
  if (Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '7px monospace';
    ctx.fillText('PRESS ENTER TO START', VIRTUAL_WIDTH / 2, 140);
  }

  // Controls
  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.fillText('ARROWS = MOVE    SPACE = FIRE', VIRTUAL_WIDTH / 2, 170);

  // Credits
  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('Inspired by Galaga', VIRTUAL_WIDTH / 2, 220);
  ctx.fillText('On-chain leaderboard powered by Midnight', VIRTUAL_WIDTH / 2, 228);
}

function renderGameOver(ctx: CanvasRenderingContext2D, finalScore: number, timer: number): void {
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 8, 0.7)';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#ef4444';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', VIRTUAL_WIDTH / 2, 80);

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText(`SCORE: ${finalScore}`, VIRTUAL_WIDTH / 2, 105);

  if (timer > 0.5 && Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '6px monospace';
    ctx.fillText('PRESS ENTER TO SUBMIT SCORE', VIRTUAL_WIDTH / 2, 140);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.fillText('ESC = SKIP TO LEADERBOARD', VIRTUAL_WIDTH / 2, 160);
}

function renderSubmitting(ctx: CanvasRenderingContext2D, timer: number): void {
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#6366f1';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SUBMITTING SCORE', VIRTUAL_WIDTH / 2, 100);

  // Animated dots
  const dots = '.'.repeat(Math.floor(timer * 3) % 4);
  ctx.fillStyle = '#64748b';
  ctx.font = '6px monospace';
  ctx.fillText(`Proving & balancing transaction${dots}`, VIRTUAL_WIDTH / 2, 120);

  ctx.fillStyle = '#334155';
  ctx.font = '5px monospace';
  ctx.fillText('Approve in your wallet terminal', VIRTUAL_WIDTH / 2, 145);
}
