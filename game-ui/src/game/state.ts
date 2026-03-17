// Game state machine

export type GameScreen =
  | 'connect'      // Wallet connection screen
  | 'deploying'    // Contract deploying / joining — waiting for chain
  | 'menu'         // Title screen
  | 'playing'      // Active gameplay
  | 'gameover'     // Death screen — enter alias
  | 'submitting'   // Submitting score to chain
  | 'proving'      // Proving elite status (ZK proof in progress)
  | 'leaderboard'; // Viewing on-chain leaderboard

let currentScreen: GameScreen = 'connect';
let screenTransitionTimer = 0;
let deployStatus = '';

export function getScreen(): GameScreen {
  return currentScreen;
}

export function setScreen(screen: GameScreen): void {
  currentScreen = screen;
  screenTransitionTimer = 0;
}

export function getScreenTimer(): number {
  return screenTransitionTimer;
}

export function updateScreenTimer(dt: number): void {
  screenTransitionTimer += dt;
}

export function setDeployStatus(status: string): void {
  deployStatus = status;
}

export function getDeployStatus(): string {
  return deployStatus;
}
