import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, SCALE } from '../config';
import { initInput, getInput, startTextInput, stopTextInput, getTextBuffer, isTextInputActive } from './input';
import { getScreen, setScreen, updateScreenTimer, getScreenTimer, getDeployStatus } from './state';
import {
  initEntities,
  updateEntities,
  renderEntities,
  moveShip,
  firePlayerTorpedo,
  fighter,
  score,
  stage,
} from './entities';
import { renderHud } from '../ui/hud';
import { renderConnectScreen, handleConnectInput } from '../ui/connect-screen';
import { renderLeaderboard, handleLeaderboardInput, showBanner, resetThresholdInput } from '../ui/leaderboard';
import { getWalletClient } from '../providers/wallet-connector';
import { initAudio, playShoot, playMenuSelect, playLevelStart, playScoreSubmit, startTheme, stopTheme } from './audio';
import { renderTitle, TITLE_BOTTOM } from '../ui/title';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let finalScore = 0;
let playerAlias = '';

// Callbacks set by main.ts after providers are ready
let onSubmitScore: ((score: bigint, alias: string) => Promise<void>) | null = null;
let onProveElite: ((threshold: bigint) => Promise<void>) | null = null;
let onRevealScore: (() => Promise<void>) | null = null;

export function setCallbacks(callbacks: {
  submitScore?: (score: bigint, alias: string) => Promise<void>;
  proveElite?: (threshold: bigint) => Promise<void>;
  revealScore?: () => Promise<void>;
}): void {
  if (callbacks.submitScore) onSubmitScore = callbacks.submitScore;
  if (callbacks.proveElite) onProveElite = callbacks.proveElite;
  if (callbacks.revealScore) onRevealScore = callbacks.revealScore;
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
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  const input = getInput();
  const screen = getScreen();

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

    case 'deploying':
      renderDeploying(ctx, getScreenTimer());
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

      if (fighter.lives <= 0 && !fighter.alive) {
        finalScore = score;
        stopTheme();
        startTextInput('');
        setScreen('gameover');
      }
      break;

    case 'gameover':
      renderEntities(ctx);
      renderGameOver(ctx, finalScore, getScreenTimer());

      if (input.enter && getScreenTimer() > 0.5 && getTextBuffer().length > 0) {
        playerAlias = stopTextInput();
        playMenuSelect();
        if (onSubmitScore) {
          setScreen('submitting');
          onSubmitScore(BigInt(finalScore), playerAlias)
            .then(() => {
              playScoreSubmit();
              showBanner('SCORE SUBMITTED ON-CHAIN!', 'success');
              setScreen('leaderboard');
            })
            .catch((err) => {
              console.error('Score submission failed:', err);
              showBanner('Score submission failed', 'error');
              setScreen('leaderboard');
            });
        } else {
          setScreen('leaderboard');
        }
      }
      if (input.escape) {
        stopTextInput();
        setScreen('leaderboard');
      }
      break;

    case 'submitting':
      renderSubmitting(ctx, getScreenTimer());
      break;

    case 'proving':
      renderProving(ctx, getScreenTimer());
      break;

    case 'revealing':
      renderRevealing(ctx, getScreenTimer());
      break;

    case 'leaderboard':
      renderLeaderboard(ctx, getScreenTimer(), dt);
      handleLeaderboardInput(input, {
        onPlayAgain: () => {
          resetThresholdInput();
          initEntities();
          startTheme();
          playLevelStart();
          setScreen('playing');
        },
        onProveElite: onProveElite
          ? (threshold) => {
              setScreen('proving');
              onProveElite!(threshold)
                .then(() => {
                  playScoreSubmit();
                  showBanner(`PROVED ELITE: score >= ${threshold}`, 'success');
                  setScreen('leaderboard');
                })
                .catch((err: unknown) => {
                  console.error('Prove elite failed:', err);
                  const msg = err instanceof Error ? err.message : String(err);
                  if (msg.includes('Below threshold')) {
                    showBanner(`Score below ${threshold} — proof rejected`, 'error');
                  } else if (msg.includes('No score found')) {
                    showBanner('No score on-chain — play first', 'error');
                  } else {
                    showBanner('Proof failed', 'error');
                  }
                  setScreen('leaderboard');
                });
            }
          : undefined,
        onRevealScore: onRevealScore
          ? () => {
              setScreen('revealing');
              onRevealScore!()
                .then(() => {
                  playScoreSubmit();
                  showBanner('SCORE REVEALED ON-CHAIN!', 'success');
                  setScreen('leaderboard');
                })
                .catch((err: unknown) => {
                  console.error('Reveal score failed:', err);
                  const msg = err instanceof Error ? err.message : String(err);
                  if (msg.includes('No score found')) {
                    showBanner('No score on-chain — play first', 'error');
                  } else {
                    showBanner('Reveal failed', 'error');
                  }
                  setScreen('leaderboard');
                });
            }
          : undefined,
      });
      break;
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// ── Screen renderers ──

function renderDeploying(ctx: CanvasRenderingContext2D, timer: number): void {
  renderTitle(ctx, timer);

  const baseY = TITLE_BOTTOM;
  const status = getDeployStatus();
  const dots = '.'.repeat(Math.floor(timer * 2) % 4);
  ctx.fillStyle = '#6366f1';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(status + dots, VIRTUAL_WIDTH / 2, baseY);

  const barWidth = 120;
  const barX = (VIRTUAL_WIDTH - barWidth) / 2;
  const barY = baseY + 12;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barX, barY, barWidth, 4);
  const progress = ((Math.sin(timer * 2) + 1) / 2) * barWidth;
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(barX, barY, progress, 4);

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('This may take a moment — proving & balancing the deploy tx', VIRTUAL_WIDTH / 2, barY + 20);
  ctx.fillText('Check your wallet terminal for approval prompts', VIRTUAL_WIDTH / 2, barY + 30);
}

function renderMenu(ctx: CanvasRenderingContext2D, timer: number): void {
  renderTitle(ctx, timer);

  const baseY = TITLE_BOTTOM;

  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('A Midnight DApp Connector Demo', VIRTUAL_WIDTH / 2, baseY);

  if (timer > 3.5 && Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '7px monospace';
    ctx.fillText('PRESS ENTER TO START', VIRTUAL_WIDTH / 2, baseY + 25);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.fillText('ARROWS = MOVE    SPACE = FIRE', VIRTUAL_WIDTH / 2, baseY + 45);

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('Inspired by Galaga', VIRTUAL_WIDTH / 2, 220);
  ctx.fillText('On-chain leaderboard powered by Midnight', VIRTUAL_WIDTH / 2, 228);
}

function renderGameOver(ctx: CanvasRenderingContext2D, finalScore: number, timer: number): void {
  ctx.fillStyle = 'rgba(0, 0, 8, 0.7)';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#ef4444';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', VIRTUAL_WIDTH / 2, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText(`SCORE: ${finalScore}`, VIRTUAL_WIDTH / 2, 95);

  // Alias input
  ctx.fillStyle = '#6366f1';
  ctx.font = '6px monospace';
  ctx.fillText('ENTER YOUR CALLSIGN:', VIRTUAL_WIDTH / 2, 120);

  const alias = getTextBuffer();
  const cursor = Math.floor(timer * 3) % 2 === 0 ? '_' : '';
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText((alias || '') + cursor, VIRTUAL_WIDTH / 2, 138);

  if (alias.length > 0 && timer > 0.5 && Math.floor(timer * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.font = '6px monospace';
    ctx.fillText('PRESS ENTER TO SUBMIT SCORE', VIRTUAL_WIDTH / 2, 165);
  } else if (alias.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '5px monospace';
    ctx.fillText('Type your name (max 12 chars)', VIRTUAL_WIDTH / 2, 165);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '5px monospace';
  ctx.fillText('ESC = SKIP TO LEADERBOARD', VIRTUAL_WIDTH / 2, 185);
}

function renderSubmitting(ctx: CanvasRenderingContext2D, timer: number): void {
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#6366f1';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SUBMITTING SCORE', VIRTUAL_WIDTH / 2, 100);

  const dots = '.'.repeat(Math.floor(timer * 3) % 4);
  ctx.fillStyle = '#64748b';
  ctx.font = '6px monospace';
  ctx.fillText(`Proving & balancing transaction${dots}`, VIRTUAL_WIDTH / 2, 120);

  ctx.fillStyle = '#334155';
  ctx.font = '5px monospace';
  ctx.fillText('Approve in your wallet terminal', VIRTUAL_WIDTH / 2, 145);
}

function renderProving(ctx: CanvasRenderingContext2D, timer: number): void {
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#8b5cf6';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PROVING ELITE STATUS', VIRTUAL_WIDTH / 2, 90);

  const dots = '.'.repeat(Math.floor(timer * 3) % 4);
  ctx.fillStyle = '#64748b';
  ctx.font = '6px monospace';
  ctx.fillText(`Generating zero-knowledge proof${dots}`, VIRTUAL_WIDTH / 2, 115);

  ctx.fillStyle = '#334155';
  ctx.font = '5px monospace';
  ctx.fillText('Proving: "my score >= threshold"', VIRTUAL_WIDTH / 2, 140);
  ctx.fillText('without revealing the exact score', VIRTUAL_WIDTH / 2, 152);

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('Approve in your wallet terminal', VIRTUAL_WIDTH / 2, 175);
}

function renderRevealing(ctx: CanvasRenderingContext2D, timer: number): void {
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('REVEALING SCORE', VIRTUAL_WIDTH / 2, 90);

  const dots = '.'.repeat(Math.floor(timer * 3) % 4);
  ctx.fillStyle = '#64748b';
  ctx.font = '6px monospace';
  ctx.fillText(`Publishing your score on-chain${dots}`, VIRTUAL_WIDTH / 2, 115);

  ctx.fillStyle = '#334155';
  ctx.font = '5px monospace';
  ctx.fillText('Your hidden score will become public', VIRTUAL_WIDTH / 2, 140);
  ctx.fillText('on the leaderboard for all to see', VIRTUAL_WIDTH / 2, 152);

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('Approve in your wallet terminal', VIRTUAL_WIDTH / 2, 175);
}
