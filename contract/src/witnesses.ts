import { type Ledger } from './managed/starship/contract/index';
import { type WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type StarshipPrivateState = {
  readonly secretKey: Uint8Array;
  readonly score: bigint | null;
};

export const createStarshipPrivateState = (
  secretKey: Uint8Array,
  score: bigint | null = null,
): StarshipPrivateState => ({
  secretKey,
  score,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, StarshipPrivateState>): [StarshipPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],

  storeScore: (
    { privateState }: WitnessContext<Ledger, StarshipPrivateState>,
    score: bigint,
  ): [StarshipPrivateState, []] => [
    { ...privateState, score },
    [],
  ],

  getStoredScore: ({
    privateState,
  }: WitnessContext<Ledger, StarshipPrivateState>): [StarshipPrivateState, bigint] => {
    if (privateState.score === null) {
      throw new Error('No score stored in private state');
    }
    return [privateState, privateState.score];
  },
};
