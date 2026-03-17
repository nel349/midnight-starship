import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { initEngine, setCallbacks } from './game/engine';
import { setLeaderboardData } from './ui/leaderboard';
import { getWalletClient } from './providers/wallet-connector';
import { createMidnightProviders } from './providers/midnight-providers';
import { StarshipAPI, type DeployedStarshipAPI } from '../../api/src/index';
import { showToast } from './ui/toast';
import { NETWORK_ID } from './config';
import type { Subscription } from 'rxjs';

// Set network ID from env before anything else
setNetworkId(NETWORK_ID as NetworkId);

let api: DeployedStarshipAPI | null = null;
let stateSub: Subscription | null = null;

async function initializeAPI(): Promise<void> {
  const wallet = getWalletClient();
  if (!wallet) return;

  try {
    const providers = await createMidnightProviders(wallet);

    // Check for existing contract address in URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      showToast('Joining existing contract...', 'info');
      api = await StarshipAPI.join(providers, hash);
    } else {
      showToast('Deploying new contract...', 'info');
      api = await StarshipAPI.deploy(providers);
      window.location.hash = api.deployedContractAddress;
    }

    showToast(`Contract: ${api.deployedContractAddress.slice(0, 12)}...`, 'success');

    // Subscribe to leaderboard state
    stateSub = api.state$.subscribe({
      next: (state: { entries: { playerHash: string; alias: string; score: bigint }[]; topScore: bigint }) => setLeaderboardData(state),
      error: (err: unknown) => console.error('State subscription error:', err),
    });

    // Wire up game callbacks
    setCallbacks({
      submitScore: async (score, alias) => {
        if (!api) throw new Error('API not initialized');
        await api.submitScore(score, alias);
        showToast('Score submitted on-chain!', 'success');
      },
      proveElite: async (threshold) => {
        if (!api) throw new Error('API not initialized');
        await api.proveElite(threshold);
        showToast(`Proved elite status (score >= ${threshold})!`, 'success');
      },
    });
  } catch (err) {
    console.error('API initialization failed:', err);
    showToast('Contract setup failed — playing offline', 'error');
  }
}

// Boot
initEngine();

// Watch for wallet connection, then initialize API
const checkWallet = setInterval(() => {
  if (getWalletClient()) {
    clearInterval(checkWallet);
    initializeAPI();
  }
}, 500);
