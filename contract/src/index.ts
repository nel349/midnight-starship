import { CompiledContract } from '@midnight-ntwrk/compact-js';
export * from './managed/starship/contract/index';
export * from './witnesses';

import * as CompiledStarshipContract from './managed/starship/contract/index';
import * as Witnesses from './witnesses';

export const compiledStarshipContract = CompiledContract.make<
  CompiledStarshipContract.Contract<Witnesses.StarshipPrivateState>
>(
  'starship',
  CompiledStarshipContract.Contract<Witnesses.StarshipPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/starship'),
);
