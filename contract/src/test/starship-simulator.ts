import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  type Ledger,
  ledger,
  pureCircuits,
} from '../managed/starship/contract/index';
import { type StarshipPrivateState, witnesses } from '../witnesses';

export class StarshipSimulator {
  readonly contract: Contract<StarshipPrivateState>;
  circuitContext: CircuitContext<StarshipPrivateState>;
  private stateByKey = new Map<string, StarshipPrivateState>();

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<StarshipPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey, score: null }, '0'.repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array): void {
    const currentKey = this.circuitContext.currentPrivateState.secretKey;
    this.stateByKey.set(Buffer.from(currentKey).toString('hex'), this.circuitContext.currentPrivateState);
    const hex = Buffer.from(secretKey).toString('hex');
    this.circuitContext.currentPrivateState = this.stateByKey.get(hex) ?? { secretKey, score: null };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): StarshipPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public playerHash(sk: Uint8Array): Uint8Array {
    return pureCircuits.playerHash(sk);
  }

  public submitScore(score: bigint, alias: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.submit_score(
      this.circuitContext,
      score,
      alias,
    ).context;
    return this.getLedger();
  }

  public proveElite(threshold: bigint): void {
    this.circuitContext = this.contract.impureCircuits.prove_elite(
      this.circuitContext,
      threshold,
    ).context;
  }

  public revealScore(): Ledger {
    this.circuitContext = this.contract.impureCircuits.reveal_score(
      this.circuitContext,
    ).context;
    return this.getLedger();
  }
}
