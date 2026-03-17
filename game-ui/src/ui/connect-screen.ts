import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../config';
import { type InputState } from '../game/input';
import { setScreen } from '../game/state';
import { connectWallet } from '../providers/wallet-connector';
import { showToast } from './toast';

let connecting = false;
let error = '';

export function renderConnectScreen(
  ctx: CanvasRenderingContext2D,
  timer: number,
): void {
  // Title
  ctx.fillStyle = '#6366f1';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT', VIRTUAL_WIDTH / 2, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText('STARSHIP', VIRTUAL_WIDTH / 2, 70);

  // Connection prompt
  if (connecting) {
    const dots = '.'.repeat(Math.floor(timer * 3) % 4);
    ctx.fillStyle = '#6366f1';
    ctx.font = '6px monospace';
    ctx.fillText(`Connecting to wallet${dots}`, VIRTUAL_WIDTH / 2, 120);
  } else if (error) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '5px monospace';
    ctx.fillText(error, VIRTUAL_WIDTH / 2, 110);

    ctx.fillStyle = '#64748b';
    ctx.fillText('Make sure `mn serve` is running', VIRTUAL_WIDTH / 2, 125);

    if (Math.floor(timer * 2) % 2 === 0) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '6px monospace';
      ctx.fillText('PRESS ENTER TO RETRY', VIRTUAL_WIDTH / 2, 145);
    }
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '5px monospace';
    ctx.fillText('Connect to your Midnight wallet', VIRTUAL_WIDTH / 2, 105);
    ctx.fillText('via `mn serve` (WebSocket)', VIRTUAL_WIDTH / 2, 115);

    if (Math.floor(timer * 2) % 2 === 0) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '6px monospace';
      ctx.fillText('PRESS ENTER TO CONNECT', VIRTUAL_WIDTH / 2, 140);
    }
  }

  // Skip option
  ctx.fillStyle = '#334155';
  ctx.font = '4px monospace';
  ctx.fillText('ESC = PLAY WITHOUT WALLET', VIRTUAL_WIDTH / 2, 200);
  ctx.fillText('(scores will not be saved on-chain)', VIRTUAL_WIDTH / 2, 210);
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
