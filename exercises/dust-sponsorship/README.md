# Dust Sponsorship Exercise

Verifies that a sponsor wallet can pay dust (transaction fees) for another wallet's transaction **without affecting ownership**. The app wallet generates the ZK proof, and `ownPublicKey()` records the app wallet's key on-chain — not the sponsor's.

## Why This Matters

On Midnight, every on-chain write requires DUST tokens for fees. This creates friction for new users and DApps — players shouldn't need DUST to submit a game score. Dust sponsorship lets a backend or service wallet pay fees on behalf of users, enabling free-to-use DApps.

## The Flow

```
App Wallet (user)                    Sponsor Wallet (backend)
─────────────────                    ──────────────────────────
1. Call circuit
   → generate ZK proof
   → get UnboundTransaction
                          ─────►
                                     2. balanceUnboundTransaction
                                        tokenKindsToBalance: ["dust"]
                                     3. finalizeRecipe
                          ◄─────
4. submitTransaction
   (on-chain: ownPublicKey = app)
```

## Key Insight

`ownPublicKey()` is determined at **proof generation time** (step 1), not at dust balancing (step 2) or submission (step 4). The sponsor only touches the dust segment of the transaction.

## Prerequisites

- Node.js >= 20
- [Compact compiler](https://docs.midnight.network/getting-started/installation)
- Docker (for localnet)
- [midnight-wallet-cli](https://www.npmjs.com/package/midnight-wallet-cli) — `npm install -g midnight-wallet-cli`

## Run

```bash
# 1. Start localnet
mn localnet up

# 2. Compile the contract
cd exercises/dust-sponsorship
npm run compact

# 3. Run the test
npm test
```

## Expected Output

```
=== DUST SPONSORSHIP RESULT ===
  recorded_caller: 1bd4f827...
  app wallet PK:   1bd4f827...
  sponsor PK:      5aee546a...
  match app:       true
  match sponsor:   false

 ✓ ownPublicKey matches app wallet, not sponsor wallet
```

## Contract

`contract/src/ownership-test.compact` — minimal circuit that writes `ownPublicKey()` to the ledger:

```compact
import CompactStandardLibrary;
export ledger recorded_caller: ZswapCoinPublicKey;
witness local_nonce(): Bytes<32>;
export circuit record_caller(): [] {
  local_nonce();
  recorded_caller = ownPublicKey();
}
```

## Test Technique

The test intercepts the `UnboundTransaction` before balancing by overriding the wallet provider's `balanceTx` function. This captures the transaction after the ZK proof is generated but before any dust is added — the exact point where the sponsor takes over.

## Credit

Flow confirmed by [bochaco](https://github.com/bochaco) (Midnight developer) via Discord, 2026-03-27.
