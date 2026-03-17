/**
 * Integration tests for the Starship privacy-first contract.
 *
 * Requires a running localnet (node:9944, indexer:8088, proof-server:6300).
 * Start with: midnight localnet up
 *
 * Verifies:
 * - submit_score stores a commitment hash, not a plaintext score
 * - prove_elite succeeds when the player's hidden score >= threshold
 * - prove_elite fails when the player's hidden score < threshold
 * - reveal_score publishes the actual score on-chain
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  initializeMidnightProviders,
  MidnightWalletProvider,
  type EnvironmentConfiguration,
} from '@midnight-ntwrk/testkit-js';
import { deployContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ledger, type Contract, type Witnesses } from '../../contract/src/managed/starship/contract/index.js';
import {
  compiledStarshipContract,
  createStarshipPrivateState,
  type StarshipPrivateState,
} from '../../contract/src/index.js';
import {
  type StarshipProviders,
  starshipPrivateStateKey,
} from '../../api/src/common-types.js';
import { StarshipConfiguration } from '../src/starship-config.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger(
  path.resolve(currentDir, '..', 'logs', `starship-privacy_${new Date().toISOString()}.log`),
);

// Localnet endpoints — must be running before tests
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

// Genesis wallet seed (pre-funded in dev mode)
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000002';

function generatePrivateState(): StarshipPrivateState {
  const secretKey = new Uint8Array(32);
  crypto.getRandomValues(secretKey);
  return createStarshipPrivateState(secretKey);
}

describe('Starship Privacy Contract', () => {
  let wallet: MidnightWalletProvider;
  let providers: StarshipProviders;
  let contractAddress: string;
  let deployedContract: FoundContract<Contract<StarshipPrivateState, Witnesses<StarshipPrivateState>>>;

  beforeAll(async () => {
    setNetworkId('undeployed');

    // Build wallet directly against running localnet (no testcontainers)
    wallet = await MidnightWalletProvider.build(logger, envConfig, GENESIS_SEED);
    await wallet.start(true);

    // Initialize providers
    const contractConfig = new StarshipConfiguration();
    providers = initializeMidnightProviders(wallet, envConfig, contractConfig);

    // Deploy the Starship contract
    deployedContract = await deployContract(providers, {
      compiledContract: compiledStarshipContract,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: generatePrivateState(),
    });
    contractAddress = deployedContract.deployTxData.public.contractAddress;
  });

  afterAll(async () => {
    await wallet?.stop();
  });

  // ── Helper: query the current ledger state ──

  async function getLedgerState() {
    const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!contractState) throw new Error('Contract state not found');
    return ledger(contractState.data);
  }

  // ── Tests ──

  test('submit_score stores commitment hash, not plaintext score', async () => {
    const score = 1000n;
    const alias = 'ACE';

    const txData = await deployedContract.callTx.submit_score(score, alias);
    expect(txData.public.status).toBeTruthy();

    const state = await getLedgerState();

    expect(state.scoreCommitments.isEmpty()).toBe(false);
    expect(state.entryCount).toBeGreaterThanOrEqual(1n);

    let foundCommitment = false;
    for (const [playerHashBytes, commitmentBytes] of state.scoreCommitments) {
      if (state.aliases.member(playerHashBytes)) {
        const storedAlias = state.aliases.lookup(playerHashBytes);
        if (storedAlias === alias) {
          foundCommitment = true;
          expect(commitmentBytes.length).toBe(32);
          expect(state.revealedScores.member(playerHashBytes)).toBe(false);
        }
      }
    }
    expect(foundCommitment).toBe(true);
  });

  test('prove_elite succeeds when score >= threshold', async () => {
    const txData = await deployedContract.callTx.prove_elite(500n);
    expect(txData.public.status).toBeTruthy();
  });

  test('prove_elite fails when score < threshold', async () => {
    await expect(
      deployedContract.callTx.prove_elite(2000n),
    ).rejects.toThrow();
  });

  test('reveal_score publishes actual score on-chain', async () => {
    const txData = await deployedContract.callTx.reveal_score();
    expect(txData.public.status).toBeTruthy();

    const state = await getLedgerState();

    let foundRevealed = false;
    for (const [playerHashBytes, revealedScore] of state.revealedScores) {
      if (state.aliases.member(playerHashBytes)) {
        const storedAlias = state.aliases.lookup(playerHashBytes);
        if (storedAlias === 'ACE') {
          foundRevealed = true;
          expect(revealedScore).toBe(1000n);
        }
      }
    }
    expect(foundRevealed).toBe(true);
    expect(state.topScore).toBe(1000n);
  });
});
