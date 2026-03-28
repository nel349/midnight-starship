import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as OwnershipContract from './managed/ownership-test/contract/index.js';
import { witnesses } from './witnesses.js';

export { ledger } from './managed/ownership-test/contract/index.js';
export { witnesses, createInitialPrivateState, type OwnershipTestPrivateState } from './witnesses.js';

export const compiledOwnershipContract = (CompiledContract.make as any)(
  'ownership-test',
  OwnershipContract.Contract,
).pipe(
  (CompiledContract.withWitnesses as any)(witnesses),
  (CompiledContract.withCompiledFileAssets as any)('./managed/ownership-test'),
);
