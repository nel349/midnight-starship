import { VIRTUAL_WIDTH } from '../config';

export function renderHud(
  ctx: CanvasRenderingContext2D,
  score: number,
  lives: number,
  stage: number,
  walletConnected: boolean,
): void {
  // Score (top left)
  ctx.fillStyle = '#ffffff';
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${score}`, 4, 10);

  // Stage (top center)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6366f1';
  ctx.fillText(`STAGE ${stage}`, VIRTUAL_WIDTH / 2, 10);

  // Lives (top right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#22c55e';
  ctx.fillText('\u2665'.repeat(lives), VIRTUAL_WIDTH - 4, 10);

  // Wallet indicator (bottom right)
  ctx.textAlign = 'right';
  ctx.fillStyle = walletConnected ? '#22c55e' : '#ef4444';
  ctx.font = '4px monospace';
  ctx.fillText(walletConnected ? 'WALLET OK' : 'NO WALLET', VIRTUAL_WIDTH - 4, 237);
}
