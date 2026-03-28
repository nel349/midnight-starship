/**
 * Dust Sponsorship Verification Test
 *
 * Proves that ownPublicKey() is set at ZK proof generation time, NOT at
 * dust balancing or submission time. A sponsor wallet can pay dust fees
 * for another wallet's transaction without changing ownership.
 *
 * Based on bochaco's confirmed flow:
 * 1. App wallet builds UnboundTransaction (runs circuit, generates ZK proof)
 * 2. Sponsor calls balanceUnboundTransaction with tokenKindsToBalance: ["dust"]
 * 3. Sponsor calls finalizeRecipe
 * 4. App wallet submits the finalized tx (no signRecipe needed from sponsor)
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
import { compiledOwnershipContract, createInitialPrivateState, ledger } from '../contract/src/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger(
  path.resolve(currentDir, '..', 'logs', `dust-sponsorship_${new Date().toISOString()}.log`),
);

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

// Two pre-funded seeds on localnet
const APP_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const SPONSOR_SEED = '0000000000000000000000000000000000000000000000000000000000000002';

describe('Dust Sponsorship', () => {
  let walletA: MidnightWalletProvider; // app wallet (owns the tx)
  let walletB: MidnightWalletProvider; // sponsor wallet (pays dust)

  beforeAll(async () => {
    setNetworkId('undeployed');

    walletA = await MidnightWalletProvider.build(logger, envConfig, APP_SEED);
    walletB = await MidnightWalletProvider.build(logger, envConfig, SPONSOR_SEED);

    await walletA.start(true);
    await walletB.start(true);
  }, 120_000);

  afterAll(async () => {
    await walletA?.stop();
    await walletB?.stop();
  });

  test('ownPublicKey matches app wallet, not sponsor wallet', async () => {
    const contractConfig = new OwnershipTestConfig();
    const providersA = initializeMidnightProviders(walletA, envConfig, contractConfig);

    // Step 1: Deploy contract with wallet A
    const deployed = await (deployContract as any)(providersA, {
      compiledContract: compiledOwnershipContract,
      privateStateId: 'ownership-test',
      initialPrivateState: createInitialPrivateState(),
    });
    const contractAddress = deployed.deployTxData.public.contractAddress;
    console.log('Contract deployed at:', contractAddress);

    // Step 2: Intercept the unbound tx from callTx
    let capturedTx: any = null;
    providersA.walletProvider.balanceTx = async (tx: any) => {
      capturedTx = tx;
      throw new Error('__CAPTURED__');
    };

    try {
      await deployed.callTx.record_caller();
    } catch (e: any) {
      if (!e.message.includes('__CAPTURED__')) {
        throw e; // Re-throw unexpected errors
      }
    }
    expect(capturedTx).not.toBeNull();
    console.log('Captured unbound tx from wallet A');

    // Step 3: Sponsor (wallet B) balances with dust only
    const recipe = await walletB.wallet.balanceUnboundTransaction(
      capturedTx,
      {
        shieldedSecretKeys: walletB.zswapSecretKeys,
        dustSecretKey: walletB.dustSecretKey,
      },
      {
        tokenKindsToBalance: ['dust'],
        ttl: new Date(Date.now() + 60 * 60 * 1000),
      },
    );
    console.log('Sponsor balanced with dust');

    // Step 4: Sponsor finalizes (no signRecipe needed per bochaco)
    const finalized = await walletB.wallet.finalizeRecipe(recipe);
    console.log('Recipe finalized by sponsor');

    // Step 5: App wallet submits
    await walletA.wallet.submitTransaction(finalized);
    console.log('Transaction submitted by app wallet');

    // Wait for block confirmation
    console.log('Waiting for block confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15_000));

    // Step 6: Read on-chain state
    const contractState = await providersA.publicDataProvider.queryContractState(contractAddress);
    if (!contractState) throw new Error('Contract state not found');
    const state = ledger(contractState.data);
    const recordedCaller = state.recorded_caller;

    // Step 7: Assert ownership
    const walletACoinPK = walletA.getCoinPublicKey();
    const walletBCoinPK = walletB.getCoinPublicKey();
    const recordedHex = Buffer.from(recordedCaller.bytes).toString('hex');

    console.log('');
    console.log('=== DUST SPONSORSHIP RESULT ===');
    console.log('Recorded caller:', recordedHex);
    console.log('Wallet A (app):    ', walletACoinPK);
    console.log('Wallet B (sponsor):', walletBCoinPK);
    console.log('Match app wallet:  ', recordedHex === walletACoinPK);
    console.log('Match sponsor:     ', recordedHex === walletBCoinPK);
    console.log('');

    expect(recordedHex).toBe(walletACoinPK);
    expect(recordedHex).not.toBe(walletBCoinPK);
  }, 300_000);
});
