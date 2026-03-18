/**
 * Provides the {@link StarshipAPI} for deploying, joining, and interacting
 * with Starship leaderboard contracts.
 *
 * @packageDocumentation
 */

import { ledger } from '../../contract/src/managed/starship/contract/index';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  type LeaderboardState,
  type StarshipProviders,
  type DeployedStarshipContract,
  starshipPrivateStateKey,
} from './common-types';
import {
  type StarshipPrivateState,
  createStarshipPrivateState,
  compiledStarshipContract,
} from '../../contract/src/index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

/**
 * Public interface for a deployed Starship leaderboard contract.
 */
export interface DeployedStarshipAPI {
  /** The on-chain address of this contract. */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Observable stream of leaderboard state derived from on-chain data.
   * Emits whenever the contract's public ledger state changes.
   */
  readonly state$: Observable<LeaderboardState>;

  /**
   * Submits a score to the on-chain leaderboard.
   *
   * @param score - The player's score.
   * @param alias - The player's display name.
   *
   * @remarks
   * Only a commitment hash is stored on-chain. The actual score is kept
   * in private state. The alias is publicly visible.
   */
  submitScore: (score: bigint, alias: string) => Promise<void>;

  /**
   * Proves that the current player's score meets or exceeds a threshold,
   * without revealing the exact score (selective disclosure via ZK proof).
   *
   * @param threshold - The minimum score to prove.
   */
  proveElite: (threshold: bigint) => Promise<void>;

  /**
   * Voluntarily reveals the player's actual score on-chain.
   * Once revealed, the score is publicly visible on the leaderboard.
   */
  revealScore: () => Promise<void>;
}

/**
 * Manages interactions with a deployed Starship leaderboard contract.
 *
 * @remarks
 * Use the static {@link StarshipAPI.deploy} or {@link StarshipAPI.join} methods
 * to obtain an instance. The constructor is private to enforce this factory pattern,
 * ensuring providers and contract state are always properly initialized.
 */
export class StarshipAPI implements DeployedStarshipAPI {
  /** @internal */
  private constructor(
    private readonly deployedContract: DeployedStarshipContract,
    providers: StarshipProviders,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(map((contractState) => deriveLeaderboardState(contractState.data)));
  }

  /** @inheritdoc */
  readonly deployedContractAddress: ContractAddress;

  /** @inheritdoc */
  readonly state$: Observable<LeaderboardState>;

  /** @inheritdoc */
  async submitScore(score: bigint, alias: string): Promise<void> {
    await this.deployedContract.callTx.submit_score(score, alias);
  }

  /** @inheritdoc */
  async proveElite(threshold: bigint): Promise<void> {
    await this.deployedContract.callTx.prove_elite(threshold);
  }

  /** @inheritdoc */
  async revealScore(): Promise<void> {
    await this.deployedContract.callTx.reveal_score();
  }

  /**
   * Deploys a new Starship leaderboard contract to the network.
   *
   * @param providers - The Midnight providers for this contract.
   * @returns A {@link StarshipAPI} instance connected to the newly deployed contract.
   */
  static async deploy(providers: StarshipProviders): Promise<StarshipAPI> {
    const deployedContract = await deployContract(providers, {
      compiledContract: compiledStarshipContract,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: generatePrivateState(),
    });

    return new StarshipAPI(deployedContract, providers);
  }

  /**
   * Joins an existing Starship leaderboard contract on the network.
   *
   * @param providers - The Midnight providers for this contract.
   * @param contractAddress - The address of a previously deployed Starship contract.
   * @returns A {@link StarshipAPI} instance connected to the found contract.
   */
  static async join(
    providers: StarshipProviders,
    contractAddress: ContractAddress,
  ): Promise<StarshipAPI> {
    const deployedContract = await findDeployedContract(providers, {
      compiledContract: compiledStarshipContract,
      contractAddress,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: generatePrivateState(),
    });

    return new StarshipAPI(deployedContract, providers);
  }
}

/**
 * Generates a fresh private state with a random 32-byte secret key.
 *
 * @internal
 */
function generatePrivateState(): StarshipPrivateState {
  const secretKey = new Uint8Array(32);
  crypto.getRandomValues(secretKey);
  return createStarshipPrivateState(secretKey);
}

/**
 * Derives a {@link LeaderboardState} from raw on-chain contract state.
 *
 * Iterates `scoreCommitments` to find all players, checks `revealedScores`
 * for voluntary disclosures, and pulls aliases. Revealed entries sort first
 * (by score descending), followed by hidden entries (alphabetically by alias).
 *
 * @internal
 */
function deriveLeaderboardState(data: Parameters<typeof ledger>[0]): LeaderboardState {
  const state = ledger(data);
  const entries: LeaderboardState['entries'] = [];

  for (const [keyBytes] of state.scoreCommitments) {
    const playerHash = toHex(keyBytes);
    const alias = state.aliases.member(keyBytes)
      ? state.aliases.lookup(keyBytes)
      : 'Anonymous';
    const revealedScore = state.revealedScores.member(keyBytes)
      ? state.revealedScores.lookup(keyBytes)
      : null;
    entries.push({ playerHash, alias, revealedScore });
  }

  // Revealed first (by score desc), then hidden (alphabetically by alias)
  entries.sort((a, b) => {
    if (a.revealedScore !== null && b.revealedScore !== null) {
      return b.revealedScore > a.revealedScore ? 1 : b.revealedScore < a.revealedScore ? -1 : 0;
    }
    if (a.revealedScore !== null) return -1;
    if (b.revealedScore !== null) return 1;
    return a.alias.localeCompare(b.alias);
  });

  return {
    entries,
    topScore: state.topScore,
    entryCount: state.entryCount,
  };
}

export * from './common-types';
