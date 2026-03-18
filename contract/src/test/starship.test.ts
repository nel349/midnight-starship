import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { StarshipSimulator } from './starship-simulator';
import { randomBytes } from './utils';
import { pureCircuits } from '../managed/starship/contract/index';

setNetworkId('undeployed');

describe('Starship contract', () => {
  it('initializes with empty ledger and null private score', () => {
    const key = randomBytes(32);
    const sim = new StarshipSimulator(key);
    const ledger = sim.getLedger();
    expect(ledger.scoreCommitments.isEmpty()).toBe(true);
    expect(ledger.revealedScores.isEmpty()).toBe(true);
    expect(ledger.aliases.isEmpty()).toBe(true);
    expect(ledger.topScore).toBe(0n);
    expect(ledger.entryCount).toBe(0n);
    expect(sim.getPrivateState().secretKey).toEqual(key);
    expect(sim.getPrivateState().score).toBeNull();
  });

  describe('playerHash', () => {
    it('is deterministic', () => {
      const key = randomBytes(32);
      expect(pureCircuits.playerHash(key)).toEqual(pureCircuits.playerHash(key));
    });

    it('differs for different keys', () => {
      expect(pureCircuits.playerHash(randomBytes(32)))
        .not.toEqual(pureCircuits.playerHash(randomBytes(32)));
    });

    it('returns 32 bytes', () => {
      expect(pureCircuits.playerHash(randomBytes(32)).length).toBe(32);
    });
  });

  describe('submit_score', () => {
    it('stores a commitment, not a plaintext score', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      const ledger = sim.submitScore(1000n, 'ACE');

      expect(ledger.scoreCommitments.size()).toBe(1n);
      expect(ledger.aliases.size()).toBe(1n);
      expect(ledger.entryCount).toBe(1n);
      expect(ledger.revealedScores.isEmpty()).toBe(true);
      expect(ledger.topScore).toBe(0n);
    });

    it('saves score in private state', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(42n, 'PILOT');
      expect(sim.getPrivateState().score).toBe(42n);
    });

    it('produces a 32-byte commitment', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      const ledger = sim.submitScore(500n, 'TEST');
      for (const [, commitment] of ledger.scoreCommitments) {
        expect(commitment.length).toBe(32);
      }
    });

    it('stores the alias', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      const ledger = sim.submitScore(100n, 'MAVERICK');
      for (const [, alias] of ledger.aliases) {
        expect(alias).toBe('MAVERICK');
      }
    });

    it('different scores produce different commitments', () => {
      const key = randomBytes(32);
      const c1 = [...new StarshipSimulator(key).submitScore(100n, 'A').scoreCommitments][0][1];
      const c2 = [...new StarshipSimulator(key).submitScore(200n, 'A').scoreCommitments][0][1];
      expect(c1).not.toEqual(c2);
    });

    it('same score with different keys produces different commitments', () => {
      const c1 = [...new StarshipSimulator(randomBytes(32)).submitScore(100n, 'A').scoreCommitments][0][1];
      const c2 = [...new StarshipSimulator(randomBytes(32)).submitScore(100n, 'B').scoreCommitments][0][1];
      expect(c1).not.toEqual(c2);
    });
  });

  describe('prove_elite', () => {
    it('succeeds when score >= threshold', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(1000n, 'ACE');
      expect(() => sim.proveElite(500n)).not.toThrow();
    });

    it('succeeds at exact threshold', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(1000n, 'ACE');
      expect(() => sim.proveElite(1000n)).not.toThrow();
    });

    it('fails when score < threshold', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(1000n, 'ACE');
      expect(() => sim.proveElite(2000n)).toThrow('Below threshold');
    });

    it('fails with no score submitted', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      expect(() => sim.proveElite(100n)).toThrow('No score found');
    });
  });

  describe('reveal_score', () => {
    it('publishes the actual score', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(1234n, 'GOOSE');
      const ledger = sim.revealScore();
      for (const [, score] of ledger.revealedScores) {
        expect(score).toBe(1234n);
      }
    });

    it('updates topScore', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(5000n, 'TOP');
      expect(sim.revealScore().topScore).toBe(5000n);
    });

    it('fails with no score submitted', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      expect(() => sim.revealScore()).toThrow('No score found');
    });
  });

  describe('multi-player', () => {
    it('two players submit independently', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(100n, 'ALPHA');
      sim.switchUser(randomBytes(32));
      const ledger = sim.submitScore(200n, 'BRAVO');

      expect(ledger.scoreCommitments.size()).toBe(2n);
      expect(ledger.aliases.size()).toBe(2n);
      expect(ledger.entryCount).toBe(2n);
      expect(ledger.revealedScores.isEmpty()).toBe(true);
    });

    it('revealing one player does not reveal the other', () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const sim = new StarshipSimulator(key1);
      sim.submitScore(100n, 'ALPHA');
      sim.switchUser(key2);
      sim.submitScore(200n, 'BRAVO');
      sim.switchUser(key1);
      const ledger = sim.revealScore();

      expect(ledger.revealedScores.size()).toBe(1n);
      expect(ledger.scoreCommitments.size()).toBe(2n);
    });

    it('prove_elite fails for player without a score', () => {
      const sim = new StarshipSimulator(randomBytes(32));
      sim.submitScore(1000n, 'ACE');
      sim.switchUser(randomBytes(32));
      expect(() => sim.proveElite(100n)).toThrow('No score found');
    });
  });
});
