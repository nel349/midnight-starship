/**
 * Dust Sponsorship Verification Test
 *
 * Proves that ownPublicKey() is determined at ZK proof generation time,
 * NOT at dust balancing or submission time. This means:
 *
 *   - Wallet A (the app) generates the proof → owns the transaction
 *   - Wallet B (the sponsor) pays the dust fees → does NOT become owner
 *   - On-chain, ownPublicKey() returns wallet A's key
 *
 * Based on bochaco's confirmed flow (Midnight Discord, 2026-03-27):
 *   1. App wallet builds UnboundTransaction (circuit + ZK proof)
 *   2. Sponsor calls balanceUnboundTransaction({ tokenKindsToBalance: ["dust"] })
 *   3. Sponsor calls finalizeRecipe (no signRecipe needed)
 *   4. App wallet submits the finalized transaction
 *
 * Requires: midnight localnet up (node:9944, indexer:8088, proof-server:6300)
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  initializeMidnightProviders,
  MidnightWalletProvider,
  type EnvironmentConfiguration,
  type ContractConfiguration,
} from '@midnight-ntwrk/testkit-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { UnboundTransaction } from '@midnight-ntwrk/wallet-sdk-capabilities/proving';
import { compiledOwnershipContract, createInitialPrivateState, ledger } from '../contract/src/index.js';

// ── Constants ──

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** Pre-funded genesis seeds on localnet */
const APP_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const SPONSOR_SEED = '0000000000000000000000000000000000000000000000000000000000000002';

/** Wait for block confirmation before reading ledger state */
const BLOCK_CONFIRMATION_MS = 15_000;

/** Transaction time-to-live */
const TX_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Sentinel error thrown to intercept the unbound tx before balancing */
const CAPTURE_SENTINEL = '__DUST_SPONSORSHIP_CAPTURE__';

const envConfig: EnvironmentConfiguration = {
  walletNetworkId: 'undeployed' as any,
  networkId: 'undeployed',
  indexer: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: undefined,
};

class OwnershipTestConfig implements ContractConfiguration {
  readonly privateStateStoreName: string;
  readonly zkConfigPath: string;

  constructor() {
    this.privateStateStoreName = `ownership-test-${Date.now()}`;
    this.zkConfigPath = path.resolve(currentDir, '..', 'contract', 'src', 'managed', 'ownership-test');
  }
}

const logger = createLogger(
  path.resolve(currentDir, '..', 'logs', `dust-sponsorship_${new Date().toISOString()}.log`),
);

// ── Test ──

describe('Dust Sponsorship', () => {
  let appWallet: MidnightWalletProvider;
  let sponsorWallet: MidnightWalletProvider;

  beforeAll(async () => {
    setNetworkId('undeployed');

    appWallet = await MidnightWalletProvider.build(logger, envConfig, APP_SEED);
    sponsorWallet = await MidnightWalletProvider.build(logger, envConfig, SPONSOR_SEED);

    await appWallet.start(true);
    await sponsorWallet.start(true);
  }, 120_000);

  afterAll(async () => {
    await appWallet?.stop();
    await sponsorWallet?.stop();
  });

  test('ownPublicKey matches app wallet, not sponsor wallet', async () => {
    // ── Step 1: Deploy contract (app wallet pays) ──
    const contractConfig = new OwnershipTestConfig();
    const appProviders = initializeMidnightProviders(appWallet, envConfig, contractConfig);

    const deployed = await (deployContract as any)(appProviders, {
      compiledContract: compiledOwnershipContract,
      privateStateId: 'ownership-test',
      initialPrivateState: createInitialPrivateState(),
    });
    const contractAddress: string = deployed.deployTxData.public.contractAddress;

    // ── Step 2: App calls circuit — intercept unbound tx before balancing ──
    //
    // The callTx pipeline: circuit execution → ZK proof → balanceTx → submit.
    // We override balanceTx to capture the UnboundTransaction after the proof
    // is generated but before any dust is added.
    let capturedTx: UnboundTransaction | null = null;
    appProviders.walletProvider.balanceTx = async (tx: UnboundTransaction) => {
      capturedTx = tx;
      throw new Error(CAPTURE_SENTINEL);
    };

    try {
      await deployed.callTx.record_caller();
    } catch (e: any) {
      if (!e.message.includes(CAPTURE_SENTINEL)) throw e;
    }
    expect(capturedTx).not.toBeNull();

    // ── Step 3: Sponsor balances with dust only ──
    const recipe = await sponsorWallet.wallet.balanceUnboundTransaction(
      capturedTx!,
      {
        shieldedSecretKeys: sponsorWallet.zswapSecretKeys,
        dustSecretKey: sponsorWallet.dustSecretKey,
      },
      {
        tokenKindsToBalance: ['dust'],
        ttl: new Date(Date.now() + TX_TTL_MS),
      },
    );

    // ── Step 4: Sponsor finalizes (no signRecipe needed) ──
    const finalized = await sponsorWallet.wallet.finalizeRecipe(recipe);

    // ── Step 5: App wallet submits ──
    await appWallet.wallet.submitTransaction(finalized);

    // ── Step 6: Wait for confirmation, read on-chain state ──
    await new Promise(resolve => setTimeout(resolve, BLOCK_CONFIRMATION_MS));

    const contractState = await appProviders.publicDataProvider.queryContractState(contractAddress);
    if (!contractState) throw new Error('Contract state not found after submission');
    const state = ledger(contractState.data);
    const recordedHex = Buffer.from(state.recorded_caller.bytes).toString('hex');

    // ── Step 7: Assert ownership ──
    const appCoinPK = appWallet.getCoinPublicKey();
    const sponsorCoinPK = sponsorWallet.getCoinPublicKey();

    console.log('');
    console.log('=== DUST SPONSORSHIP RESULT ===');
    console.log(`  recorded_caller: ${recordedHex}`);
    console.log(`  app wallet PK:   ${appCoinPK}`);
    console.log(`  sponsor PK:      ${sponsorCoinPK}`);
    console.log(`  match app:       ${recordedHex === appCoinPK}`);
    console.log(`  match sponsor:   ${recordedHex === sponsorCoinPK}`);
    console.log('');

    // ownPublicKey() was set when the app wallet generated the ZK proof.
    // The sponsor only added dust — ownership is unchanged.
    expect(recordedHex).toBe(appCoinPK);
    expect(recordedHex).not.toBe(sponsorCoinPK);
  }, 300_000);
});
