// Trivial witness — provides a random nonce to satisfy private state requirement.
// The circuit doesn't actually use the nonce for anything meaningful.

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type OwnershipTestPrivateState = {
  nonce: Uint8Array;
};

export const witnesses = {
  local_nonce: ({ privateState }: WitnessContext<unknown, OwnershipTestPrivateState>): [OwnershipTestPrivateState, Uint8Array] => {
    return [privateState, privateState.nonce];
  },
};

export function createInitialPrivateState(): OwnershipTestPrivateState {
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  return { nonce };
}
