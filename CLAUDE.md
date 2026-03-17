# Midnight Starship

Browser-based Galaga-style game with on-chain leaderboard — a demo for the Midnight DApp Connector (`mn serve`).

## Project Structure

npm workspaces monorepo:
- `contract/` — Compact smart contract (leaderboard with privacy)
- `api/` — StarshipAPI (deploy, join, submitScore, getLeaderboard, proveElite)
- `game-ui/` — Vite + Canvas game with wallet integration

## Tech Stack

- Compact smart contract language
- TypeScript, Vite, Canvas 2D
- midnight-wallet-connector (WebSocket JSON-RPC to `mn serve`)
- Midnight JS providers (indexer, proof, zk-config, private state)
- No frameworks — vanilla TypeScript + Canvas

## Key Patterns

- API follows bboard example: `StarshipAPI.deploy()` / `.join()` / `.state$`
- Provider wiring uses `createWalletClient` (not Lace browser extension)
- Game is self-contained Canvas 2D with pixel art sprites (no image assets)
- 320×240 virtual resolution, scaled with `image-rendering: pixelated`

## Contract Privacy Features

- Player identity: secret key → persistentHash (never disclosed)
- Score submission: score IS disclosed (public leaderboard)
- prove_elite: prove "I scored above X" without revealing exact score (ZK showcase)

## Commands

- `cd contract && npm run compact` — compile Compact contract
- `cd game-ui && npm run dev` — start Vite dev server
- `npm install` — install all workspace dependencies

## Reference

- bboard example: `/Users/norman/Development/midnight/midnight-libraries/example-bboard-bricktowers/`
- wallet connector: `/Users/norman/Development/tech-moderator/midnight-wallet-cli/packages/connector/`
- galaga reference: https://github.com/jwilliams219/galaga
