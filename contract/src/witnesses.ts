/*
 * This file defines the shape of the Starship leaderboard's private state,
 * as well as the single witness function that accesses it.
 */

import { type Ledger } from './managed/starship/contract/index';
import { type WitnessContext } from '@midnight-ntwrk/compact-runtime';

/* **********************************************************************
 * The only hidden state needed by the Starship contract is the user's
 * secret key. This key is never disclosed on-chain — instead, it is
 * hashed via `persistentHash` to produce a privacy-preserving player
 * identity (see `playerHash` in the Compact contract).
 *
 * Some of the library code and compiler-generated code is parameterized
 * by the type of our private state, so we define a type for it and a
 * factory function to create an instance.
 */

export type StarshipPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createStarshipPrivateState = (secretKey: Uint8Array): StarshipPrivateState => ({
  secretKey,
});

/* **********************************************************************
 * The witnesses object maps each witness function declared in the
 * Compact contract to its TypeScript implementation.
 *
 * Each witness function receives a `WitnessContext<L, PS>` as its first
 * argument, where:
 *   - `ledger: L`          — the current ledger state
 *   - `privateState: PS`   — the current private state
 *   - `contractAddress: string`
 *
 * The return value is a tuple of `[newPrivateState, returnValue]`.
 *
 * `localSecretKey` simply returns the existing secret key without
 * modifying the private state. It does not need the ledger or contract
 * address, so it destructures only `privateState`.
 */
export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, StarshipPrivateState>): [StarshipPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
