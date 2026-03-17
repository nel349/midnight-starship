import { type WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { type Ledger } from './managed/starship/contract/index';

export type StarshipPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createStarshipPrivateState = (secretKey: Uint8Array): StarshipPrivateState => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, StarshipPrivateState>): [StarshipPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
