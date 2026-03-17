import { ledger } from '../../contract/src/managed/starship/contract/index';
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
  compiledStarshipContract,
} from '../../contract/src/index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

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
      compiledContract: compiledStarshipContract as any,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: StarshipAPI.createFreshPrivateState(),
    });

    return new StarshipAPI(deployedContract, providers);
  }

  static async join(
    providers: StarshipProviders,
    contractAddress: ContractAddress,
  ): Promise<StarshipAPI> {
    const deployedContract = await findDeployedContract<StarshipContract>(providers, {
      compiledContract: compiledStarshipContract as any,
      contractAddress,
      privateStateId: starshipPrivateStateKey,
      initialPrivateState: StarshipAPI.createFreshPrivateState(),
    });

    return new StarshipAPI(deployedContract, providers);
  }

  private static createFreshPrivateState(): StarshipPrivateState {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return createStarshipPrivateState(randomBytes);
  }
}

export * from './common-types';
