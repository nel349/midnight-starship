/**
 * Starship contract — re-exports generated types, witnesses, and the
 * pre-configured {@link compiledStarshipContract} ready for deployment.
 *
 * @packageDocumentation
 */

import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * from './managed/starship/contract/index';
export * from './witnesses';

import * as StarshipContract from './managed/starship/contract/index';
import * as Witnesses from './witnesses';

/**
 * A pre-configured compiled contract that bundles the Starship contract
 * class with its witness implementations and compiled asset paths.
 *
 * Pass this directly to `deployContract` or `findDeployedContract`.
 */
export const compiledStarshipContract = CompiledContract.make<
  StarshipContract.Contract<Witnesses.StarshipPrivateState>
>(
  'starship',
  StarshipContract.Contract<Witnesses.StarshipPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/starship'),
);
