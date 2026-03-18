/**
 * Starship API common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { Contract, StarshipPrivateState, Witnesses } from '../../contract/src/index';

/**
 * Key used by the private state provider to store and retrieve the
 * {@link StarshipPrivateState} for Starship contract deployments.
 */
export const starshipPrivateStateKey = 'starshipPrivateState';

/** The literal type of {@link starshipPrivateStateKey}. */
export type PrivateStateId = typeof starshipPrivateStateKey;

/**
 * Schema describing all private states used by the application.
 *
 * @remarks
 * Each key represents the type of private state consumed by a particular
 * contract type. Since Starship uses a single contract, there is only one
 * entry. The key is used by the deployed contract when interacting with
 * the private state provider, and the value type describes the expected
 * shape of the private state.
 *
 * @public
 */
export type PrivateStates = {
  readonly starshipPrivateState: StarshipPrivateState;
};

/**
 * The Starship contract parameterized with its private state and witnesses.
 *
 * @public
 */
export type StarshipContract = Contract<StarshipPrivateState, Witnesses<StarshipPrivateState>>;

/**
 * The keys of the impure circuits exported from {@link StarshipContract}.
 *
 * @public
 */
export type StarshipCircuitKeys = Exclude<keyof StarshipContract['impureCircuits'], number | symbol>;

/**
 * The complete set of providers required to interact with a {@link StarshipContract}.
 *
 * @public
 */
export type StarshipProviders = MidnightProviders<StarshipCircuitKeys, PrivateStateId, StarshipPrivateState>;

/**
 * A {@link StarshipContract} that has been deployed to or found on the network.
 *
 * @public
 */
export type DeployedStarshipContract = FoundContract<StarshipContract>;

/**
 * A single entry on the on-chain leaderboard.
 *
 * Scores are private by default — only a commitment hash is stored on-chain.
 * Players may optionally reveal their score via `reveal_score`.
 */
export type LeaderboardEntry = {
  readonly playerHash: string;
  readonly alias: string;
  /** The player's score, or null if not yet revealed. */
  readonly revealedScore: bigint | null;
};

/**
 * Derived leaderboard state combining all on-chain score data.
 */
export type LeaderboardState = {
  /** All leaderboard entries — revealed first (by score desc), then hidden (alpha). */
  readonly entries: LeaderboardEntry[];
  /** The highest *revealed* score. */
  readonly topScore: bigint;
  /** Total number of score submissions. */
  readonly entryCount: bigint;
};
