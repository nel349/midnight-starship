// Polyfill crypto.timingSafeEqual — not provided by crypto-browserify
import crypto from 'crypto';
if (typeof crypto.timingSafeEqual !== 'function') {
  (crypto as any).timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) throw new RangeError('Input buffers must have the same byte length');
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
    return result === 0;
  };
}

import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { initEngine, setCallbacks } from './game/engine';
import { setLeaderboardData } from './ui/leaderboard';
import { connectWallet, getWalletClient } from './providers/wallet-connector';
import { createMidnightProviders } from './providers/midnight-providers';
import { StarshipAPI, type DeployedStarshipAPI } from '../../api/src/index';
import { showToast } from './ui/toast';
import { NETWORK_ID } from './config';
import { setScreen, setDeployStatus } from './game/state';
import type { Subscription } from 'rxjs';

// Set network ID from env before anything else
setNetworkId(NETWORK_ID as NetworkId);

let api: DeployedStarshipAPI | null = null;
let stateSub: Subscription | null = null;

async function initializeAPI(): Promise<void> {
  const wallet = getWalletClient();
  if (!wallet) return;

  try {
    setDeployStatus('Setting up providers...');
    const providers = await createMidnightProviders(wallet);

    // Check for existing contract address in URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      setDeployStatus('Joining existing contract...');
      api = await StarshipAPI.join(providers, hash);
    } else {
      setDeployStatus('Deploying contract — approve in terminal...');
      api = await StarshipAPI.deploy(providers);
      window.location.hash = api.deployedContractAddress;
    }

    setDeployStatus('Contract ready!');
    showToast(`Contract: ${api.deployedContractAddress.slice(0, 12)}...`, 'success');

    // Subscribe to leaderboard state
    stateSub = api.state$.subscribe({
      next: (state) => setLeaderboardData(state),
      error: (err: unknown) => console.error('State subscription error:', err),
    });

    // Wire up game callbacks
    setCallbacks({
      submitScore: async (score, alias) => {
        if (!api) throw new Error('API not initialized');
        await api.submitScore(score, alias);
        showToast('Score committed on-chain (hidden)!', 'success');
      },
      proveElite: async (threshold) => {
        if (!api) throw new Error('API not initialized');
        await api.proveElite(threshold);
        showToast(`Proved elite status (score >= ${threshold})!`, 'success');
      },
      revealScore: async () => {
        if (!api) throw new Error('API not initialized');
        await api.revealScore();
        showToast('Score revealed on-chain!', 'success');
      },
    });

    // Contract is ready — go to menu
    setScreen('menu');
  } catch (err) {
    console.error('API initialization failed:', err);
    setDeployStatus('Setup failed — playing offline');
    showToast('Contract setup failed — playing offline', 'error');
    // Still let them play without on-chain features
    setTimeout(() => setScreen('menu'), 2000);
  }
}

// Boot
initEngine();

// Connect to wallet, then initialize API
connectWallet().then(() => initializeAPI()).catch((err) => {
  console.error('Wallet connection failed:', err);
  showToast('No wallet found — playing offline', 'error');
  setTimeout(() => setScreen('menu'), 2000);
});
