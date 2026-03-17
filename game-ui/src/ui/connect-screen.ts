import { VIRTUAL_WIDTH } from '../config';
import { type InputState } from '../game/input';
import { setScreen } from '../game/state';
import { connectWallet } from '../providers/wallet-connector';
import { showToast } from './toast';
import { renderTitle, TITLE_BOTTOM } from './title';

let connecting = false;
let error = '';

export function renderConnectScreen(
  ctx: CanvasRenderingContext2D,
  timer: number,
): void {
  renderTitle(ctx, timer);

  const baseY = TITLE_BOTTOM;

  if (connecting) {
    const dots = '.'.repeat(Math.floor(timer * 3) % 4);
    ctx.fillStyle = '#6366f1';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Connecting to wallet${dots}`, VIRTUAL_WIDTH / 2, baseY);
  } else if (error) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(error, VIRTUAL_WIDTH / 2, baseY);

    ctx.fillStyle = '#64748b';
    ctx.fillText('Make sure `mn serve` is running', VIRTUAL_WIDTH / 2, baseY + 14);

    if (Math.floor(timer * 2) % 2 === 0) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '6px monospace';
      ctx.fillText('PRESS ENTER TO RETRY', VIRTUAL_WIDTH / 2, baseY + 30);
    }
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Connect to your Midnight wallet', VIRTUAL_WIDTH / 2, baseY);
    ctx.fillText('via `mn serve` (WebSocket)', VIRTUAL_WIDTH / 2, baseY + 10);

    if (timer > 3 && Math.floor(timer * 2) % 2 === 0) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '6px monospace';
      ctx.fillText('PRESS ENTER TO CONNECT', VIRTUAL_WIDTH / 2, baseY + 28);
    }
  }

  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ESC = PLAY WITHOUT WALLET', VIRTUAL_WIDTH / 2, 220);
  ctx.fillText('(scores will not be saved on-chain)', VIRTUAL_WIDTH / 2, 228);
}

export function handleConnectInput(input: InputState): void {
  if (connecting) return;

  if (input.enter) {
    connecting = true;
    error = '';
    connectWallet()
      .then(() => {
        connecting = false;
        showToast('Wallet connected!', 'success');
        setScreen('deploying');
      })
      .catch((err) => {
        connecting = false;
        error = err instanceof Error ? err.message : 'Connection failed';
      });
  }

  if (input.escape) {
    setScreen('menu');
  }
}
