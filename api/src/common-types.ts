import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { Contract, StarshipPrivateState, Witnesses } from '../../contract/src/index';

export const starshipPrivateStateKey = 'starshipPrivateState';
export type PrivateStateId = typeof starshipPrivateStateKey;

export type PrivateStates = {
  readonly starshipPrivateState: StarshipPrivateState;
};

export type StarshipContract = Contract<StarshipPrivateState, Witnesses<StarshipPrivateState>>;

export type StarshipCircuitKeys = Exclude<keyof StarshipContract['impureCircuits'], number | symbol>;

export type StarshipProviders = MidnightProviders<StarshipCircuitKeys, PrivateStateId, StarshipPrivateState>;

export type DeployedStarshipContract = FoundContract<StarshipContract>;

export type LeaderboardEntry = {
  readonly playerHash: string;
  readonly alias: string;
  readonly score: bigint;
};

export type LeaderboardState = {
  readonly entries: LeaderboardEntry[];
  readonly topScore: bigint;
  readonly entryCount: bigint;
};
