import { Contract, ledger, pureCircuits } from '../../contract/src/managed/starship/contract/index';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  type LeaderboardState,
  type StarshipContract,
  type StarshipProviders,
  type DeployedStarshipContract,
  starshipPrivateStateKey,
} from './common-types';
import {
  type StarshipPrivateState,
  createStarshipPrivateState,
  witnesses,
} from '../../contract/src/index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

const starshipContractInstance: StarshipContract = new Contract(witnesses);
const compiledContract = CompiledContract.make(
  'starship',
  starshipContractInstance as any,
) as unknown as CompiledContract.CompiledContract<StarshipContract, StarshipPrivateState, never>;

export interface DeployedStarshipAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<LeaderboardState>;
  submitScore: (score: bigint, alias: string) => Promise<void>;
  proveElite: (threshold: bigint) => Promise<void>;
}

export class StarshipAPI implements DeployedStarshipAPI {
  private constructor(
    public readonly deployedContract: DeployedStarshipContract,
    providers: StarshipProviders,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => {
          const state = ledger(contractState.data);
          const entries: LeaderboardState['entries'] = [];

          // Iterate the scores map and look up aliases
          for (const [keyBytes, score] of state.scores) {
            const playerHash = toHex(keyBytes);
            const alias = state.aliases.member(keyBytes)
              ? state.aliases.lookup(keyBytes)
              : 'Anonymous';
            entries.push({ playerHash, alias, score });
          }

          // Sort by score descending
          entries.sort((a, b) => (b.score > a.score ? 1 : b.score < a.score ? -1 : 0));

          return {
            entries,
            topScore: state.topScore,
            entryCount: state.entryCount,
          };
        }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<LeaderboardState>;

  async submitScore(score: bigint, alias: string): Promise<void> {
    await this.deployedContract.callTx.submit_score(score, alias);
  }

  async proveElite(threshold: bigint): Promise<void> {
    await this.deployedContract.callTx.prove_elite(threshold);
  }

  static async deploy(providers: StarshipProviders): Promise<StarshipAPI> {
    const deployedContract = await deployContract<StarshipContract>(providers, {
      compiledContract,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: await StarshipAPI.getPrivateState(providers),
    });

    return new StarshipAPI(deployedContract, providers);
  }

  static async join(
    providers: StarshipProviders,
    contractAddress: ContractAddress,
  ): Promise<StarshipAPI> {
    const deployedContract = await findDeployedContract<StarshipContract>(providers, {
      compiledContract,
      contractAddress,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: await StarshipAPI.getPrivateState(providers),
    });

    return new StarshipAPI(deployedContract, providers);
  }

  private static async getPrivateState(
    providers: StarshipProviders,
  ): Promise<StarshipPrivateState> {
    const existingState = await providers.privateStateProvider.get(starshipPrivateStateKey);
    if (existingState) return existingState;

    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return createStarshipPrivateState(randomBytes);
  }
}

export * from './common-types';
