/**
 * Test simulator for the Starship contract.
 *
 * Exercises all circuits locally without a running network,
 * following the pattern from midnight-libraries examples.
 */

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

  // Track private state per user so switchUser can restore it
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

  private keyHex(key: Uint8Array): string {
    return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Switch to a different player, preserving current player's private state. */
  public switchUser(secretKey: Uint8Array): void {
    // Save current user's private state
    const currentKey = this.circuitContext.currentPrivateState.secretKey;
    this.stateByKey.set(this.keyHex(currentKey), this.circuitContext.currentPrivateState);

    // Restore or create new state for the target user
    const existing = this.stateByKey.get(this.keyHex(secretKey));
    this.circuitContext.currentPrivateState = existing ?? { secretKey, score: null };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): StarshipPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  /** Pure circuit: compute playerHash from a secret key. */
  public playerHash(sk: Uint8Array): Uint8Array {
    return pureCircuits.playerHash(sk);
  }

  /** Impure circuit: submit a score with an alias. */
  public submitScore(score: bigint, alias: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.submit_score(
      this.circuitContext,
      score,
      alias,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /** Impure circuit: prove score >= threshold. */
  public proveElite(threshold: bigint): void {
    this.circuitContext = this.contract.impureCircuits.prove_elite(
      this.circuitContext,
      threshold,
    ).context;
  }

  /** Impure circuit: voluntarily reveal score on-chain. */
  public revealScore(): Ledger {
    this.circuitContext = this.contract.impureCircuits.reveal_score(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}

/** Generate a random 32-byte key. */
export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}
