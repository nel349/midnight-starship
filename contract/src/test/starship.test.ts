/**
 * Unit tests for the Starship privacy-first contract.
 *
 * Runs entirely locally — no network, no Docker, no proof server.
 * Tests all circuits and privacy properties via the simulator.
 */

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { StarshipSimulator, randomBytes } from './starship-simulator';
import { pureCircuits } from '../managed/starship/contract/index';

setNetworkId('undeployed');

describe('Starship smart contract', () => {

  // ── Initialization ──

  it('generates initial ledger state deterministically', () => {
    const key = randomBytes(32);
    const sim0 = new StarshipSimulator(key);
    const sim1 = new StarshipSimulator(key);
    const l0 = sim0.getLedger();
    const l1 = sim1.getLedger();
    expect(l0.topScore).toEqual(l1.topScore);
    expect(l0.entryCount).toEqual(l1.entryCount);
    expect(l0.scoreCommitments.isEmpty()).toEqual(l1.scoreCommitments.isEmpty());
    expect(l0.revealedScores.isEmpty()).toEqual(l1.revealedScores.isEmpty());
    expect(l0.aliases.isEmpty()).toEqual(l1.aliases.isEmpty());
  });

  it('initializes with empty ledger and null private score', () => {
    const key = randomBytes(32);
    const sim = new StarshipSimulator(key);
    const state = sim.getLedger();
    expect(state.scoreCommitments.isEmpty()).toBe(true);
    expect(state.revealedScores.isEmpty()).toBe(true);
    expect(state.aliases.isEmpty()).toBe(true);
    expect(state.topScore).toBe(0n);
    expect(state.entryCount).toBe(0n);

    const ps = sim.getPrivateState();
    expect(ps.secretKey).toEqual(key);
    expect(ps.score).toBeNull();
  });

  // ── playerHash (pure circuit) ──

  it('playerHash is deterministic for the same key', () => {
    const key = randomBytes(32);
    const hash1 = pureCircuits.playerHash(key);
    const hash2 = pureCircuits.playerHash(key);
    expect(hash1).toEqual(hash2);
  });

  it('playerHash differs for different keys', () => {
    const hash1 = pureCircuits.playerHash(randomBytes(32));
    const hash2 = pureCircuits.playerHash(randomBytes(32));
    expect(hash1).not.toEqual(hash2);
  });

  it('playerHash returns 32 bytes', () => {
    const hash = pureCircuits.playerHash(randomBytes(32));
    expect(hash.length).toBe(32);
  });

  // ── submit_score ──

  it('submit_score stores a commitment, not a plaintext score', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    const state = sim.submitScore(1000n, 'ACE');

    expect(state.scoreCommitments.isEmpty()).toBe(false);
    expect(state.scoreCommitments.size()).toBe(1n);
    expect(state.aliases.size()).toBe(1n);
    expect(state.entryCount).toBe(1n);

    // Score should NOT be in revealedScores
    expect(state.revealedScores.isEmpty()).toBe(true);

    // topScore should still be 0 (only updated on reveal)
    expect(state.topScore).toBe(0n);
  });

  it('submit_score stores the score in private state', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(42n, 'PILOT');

    const ps = sim.getPrivateState();
    expect(ps.score).toBe(42n);
  });

  it('submit_score commitment is 32 bytes', () => {
    const key = randomBytes(32);
    const sim = new StarshipSimulator(key);
    const state = sim.submitScore(500n, 'TEST');

    for (const [, commitment] of state.scoreCommitments) {
      expect(commitment.length).toBe(32);
    }
  });

  it('submit_score stores alias correctly', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    const state = sim.submitScore(100n, 'MAVERICK');

    for (const [, alias] of state.aliases) {
      expect(alias).toBe('MAVERICK');
    }
  });

  it('different scores produce different commitments', () => {
    const key = randomBytes(32);

    const sim1 = new StarshipSimulator(key);
    const state1 = sim1.submitScore(100n, 'A');

    const sim2 = new StarshipSimulator(key);
    const state2 = sim2.submitScore(200n, 'A');

    const commitments1 = [...state1.scoreCommitments].map(([, c]) => c);
    const commitments2 = [...state2.scoreCommitments].map(([, c]) => c);
    expect(commitments1[0]).not.toEqual(commitments2[0]);
  });

  it('same score with different keys produces different commitments', () => {
    const sim1 = new StarshipSimulator(randomBytes(32));
    const state1 = sim1.submitScore(100n, 'A');

    const sim2 = new StarshipSimulator(randomBytes(32));
    const state2 = sim2.submitScore(100n, 'B');

    const commitments1 = [...state1.scoreCommitments].map(([, c]) => c);
    const commitments2 = [...state2.scoreCommitments].map(([, c]) => c);
    expect(commitments1[0]).not.toEqual(commitments2[0]);
  });

  // ── prove_elite ──

  it('prove_elite succeeds when score >= threshold', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(1000n, 'ACE');
    expect(() => sim.proveElite(500n)).not.toThrow();
  });

  it('prove_elite succeeds when score == threshold', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(1000n, 'ACE');
    expect(() => sim.proveElite(1000n)).not.toThrow();
  });

  it('prove_elite fails when score < threshold', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(1000n, 'ACE');
    expect(() => sim.proveElite(2000n)).toThrow('Below threshold');
  });

  it('prove_elite fails when no score submitted', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    expect(() => sim.proveElite(100n)).toThrow('No score found');
  });

  // ── reveal_score ──

  it('reveal_score publishes the actual score', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(1234n, 'GOOSE');
    const state = sim.revealScore();

    expect(state.revealedScores.isEmpty()).toBe(false);
    for (const [, score] of state.revealedScores) {
      expect(score).toBe(1234n);
    }
  });

  it('reveal_score updates topScore', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(5000n, 'TOP');
    const state = sim.revealScore();
    expect(state.topScore).toBe(5000n);
  });

  it('reveal_score fails when no score submitted', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    expect(() => sim.revealScore()).toThrow('No score found');
  });

  // ── Multi-player scenarios ──

  it('two players can submit independently', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(100n, 'ALPHA');

    sim.switchUser(randomBytes(32));
    const state = sim.submitScore(200n, 'BRAVO');

    expect(state.scoreCommitments.size()).toBe(2n);
    expect(state.aliases.size()).toBe(2n);
    expect(state.entryCount).toBe(2n);
    // Neither score is revealed
    expect(state.revealedScores.isEmpty()).toBe(true);
  });

  it('one player revealing does not reveal the other', () => {
    const key1 = randomBytes(32);
    const key2 = randomBytes(32);

    const sim = new StarshipSimulator(key1);
    sim.submitScore(100n, 'ALPHA');

    sim.switchUser(key2);
    sim.submitScore(200n, 'BRAVO');

    // Switch back to player 1 and reveal
    sim.switchUser(key1);
    const state = sim.revealScore();

    // Only one revealed
    expect(state.revealedScores.size()).toBe(1n);
    expect(state.scoreCommitments.size()).toBe(2n);
  });

  it('prove_elite fails for player with no score after user switch', () => {
    const sim = new StarshipSimulator(randomBytes(32));
    sim.submitScore(1000n, 'ACE');

    sim.switchUser(randomBytes(32));
    expect(() => sim.proveElite(100n)).toThrow('No score found');
  });
});
